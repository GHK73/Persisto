import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Question from '../models/questions.js';
import QuestionUpload from '../models/questionUpload.js';
import User from '../models/file.js';
import s3Client from '../utils/s3Client.js';
import {
  copyS3Object,
  createS3Reference,
  createS3UploadUrl,
  deleteS3Objects,
  getS3BucketName,
  getS3FileContent,
  getS3ObjectKey,
  getS3ObjectMetadata,
  uploadBufferToS3,
} from '../utils/s3Uploader.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEST_INPUT_BYTES = 1024 * 1024;
const MAX_TOTAL_TEST_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 600;
const UPLOAD_SESSION_TTL_MS = 15 * 60 * 1000;
const COMPLETE_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/octet-stream',
  'text/markdown',
  'text/plain',
]);

class UploadValidationError extends Error {}

const parseTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    } catch {
      return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
};

const normalizeUploadFile = (file, maxBytes = MAX_FILE_BYTES) => {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > maxBytes) {
    throw new UploadValidationError(`Each file must be no larger than ${maxBytes / (1024 * 1024)} MB`);
  }

  const contentType = typeof file.contentType === 'string' && file.contentType.trim()
    ? file.contentType.trim().toLowerCase()
    : 'application/octet-stream';
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new UploadValidationError(`Unsupported file content type: ${contentType}`);
  }

  return {
    key: `question-uploads/${uuidv4()}/${uuidv4()}`,
    size: file.size,
    contentType,
  };
};

const normalizePair = (pair, maxInputBytes = MAX_FILE_BYTES) => ({
  input: normalizeUploadFile(pair?.input, maxInputBytes),
  output: normalizeUploadFile(pair?.output),
});

const getAllUploadFiles = (session) => [
  session.description,
  ...session.testCases.flatMap(({ input, output }) => [input, output]),
  ...session.sampleTestCases.flatMap(({ input, output }) => [input, output]),
];

const getQuestionObjectKeys = (question) => [
  question.descriptionFileKey,
  ...question.testCases.flatMap(({ inputFileKey, outputFileKey }) => [inputFileKey, outputFileKey]),
  ...question.sampleTestCase.flatMap(({ inputFileKey, outputFileKey }) => [inputFileKey, outputFileKey]),
].filter(Boolean).map(getS3ObjectKey);

const getQuestionUploadUrls = async (session) => {
  const createUrl = async (file) => ({
    url: await createS3UploadUrl(file.key, file.contentType, UPLOAD_URL_TTL_SECONDS),
    contentType: file.contentType,
  });

  return {
    description: await createUrl(session.description),
    testCases: await Promise.all(session.testCases.map(async ({ input, output }) => ({
      input: await createUrl(input),
      output: await createUrl(output),
    }))),
    sampleTestCases: await Promise.all(session.sampleTestCases.map(async ({ input, output }) => ({
      input: await createUrl(input),
      output: await createUrl(output),
    }))),
  };
};

const copySessionFilesToQuestion = async (session) => {
  const files = getAllUploadFiles(session);
  const keyMap = new Map(files.map((file) => [
    file.key,
    `questions/${session.questionId}/${uuidv4()}`,
  ]));

  const results = await Promise.allSettled(
    files.map((file) => copyS3Object(file.key, keyMap.get(file.key)))
  );
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    try {
      await deleteS3Objects([...keyMap.values()]);
    } catch (cleanupError) {
      console.error('Failed to clean up incomplete question S3 copies:', cleanupError);
    }
    throw failures[0].reason;
  }

  const refFor = (file) => createS3Reference(keyMap.get(file.key));
  return {
    description: refFor(session.description),
    testCases: session.testCases.map(({ input, output }) => ({
      inputFileKey: refFor(input),
      outputFileKey: refFor(output),
    })),
    sampleTestCases: session.sampleTestCases.map(({ input, output }) => ({
      inputFileKey: refFor(input),
      outputFileKey: refFor(output),
    })),
    finalKeys: [...keyMap.values()],
  };
};

export const createQuestionUpload = async (req, res) => {
  const {
    title,
    difficulty,
    timeLimitSec = 2,
    memoryLimitMb = 256,
    tags,
    description,
    testCases = [],
    sampleTestCases = [],
  } = req.body;

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
    return res.status(400).json({ message: 'A title of 1 to 200 characters is required' });
  }
  if (!['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())) {
    return res.status(400).json({ message: 'Difficulty must be easy, medium, or hard' });
  }
  if (![1, 2, 5].includes(Number(timeLimitSec))) {
    return res.status(400).json({ message: 'Time limit must be 1, 2, or 5 seconds' });
  }
  if (![128, 256, 512, 1024].includes(Number(memoryLimitMb))) {
    return res.status(400).json({ message: 'Memory limit must be 128, 256, 512, or 1024 MB' });
  }
  if (!Array.isArray(testCases) || testCases.length < 1 || testCases.length > 20) {
    return res.status(400).json({ message: 'Between 1 and 20 hidden test cases are required' });
  }
  if (!Array.isArray(sampleTestCases) || sampleTestCases.length > 5) {
    return res.status(400).json({ message: 'A maximum of 5 sample test cases is allowed' });
  }

  let session;
  try {
    const normalized = {
      description: normalizeUploadFile(description),
      testCases: testCases.map((pair) => normalizePair(pair, MAX_TEST_INPUT_BYTES)),
      sampleTestCases: sampleTestCases.map((pair) => normalizePair(pair)),
    };
    if (normalized.description.size === 0) {
      return res.status(400).json({ message: 'Description file cannot be empty' });
    }
    const totalTestInputBytes = normalized.testCases.reduce((total, testCase) => total + testCase.input.size, 0);
    if (totalTestInputBytes > MAX_TOTAL_TEST_INPUT_BYTES) {
      return res.status(400).json({ message: 'Hidden test inputs cannot exceed 4 MB total' });
    }
    const totalBytes = getAllUploadFiles(normalized).reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return res.status(400).json({ message: 'Total upload size exceeds 100 MB' });
    }

    session = await QuestionUpload.create({
      ownerId: req.user.userId,
      questionId: uuidv4(),
      title: title.trim(),
      difficulty: String(difficulty).toLowerCase(),
      timeLimitSec: Number(timeLimitSec),
      memoryLimitMb: Number(memoryLimitMb),
      tags: parseTags(tags),
      ...normalized,
      expiresAt: new Date(Date.now() + UPLOAD_SESSION_TTL_MS),
    });

    const uploads = await getQuestionUploadUrls(session);
    return res.status(201).json({
      uploadId: session.id,
      questionId: session.questionId,
      uploads,
    });
  } catch (error) {
    if (session) {
      try {
        await session.deleteOne();
      } catch (cleanupError) {
        console.error('Failed to remove incomplete question upload session:', cleanupError);
      }
    }
    if (error instanceof UploadValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Question upload session creation failed:', error);
    return res.status(500).json({ message: 'Could not prepare question file uploads' });
  }
};

export const completeQuestionUpload = async (req, res) => {
  let session;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.uploadId)) {
      return res.status(400).json({ message: 'Invalid upload session ID' });
    }
    session = await QuestionUpload.findOne({
      _id: req.params.uploadId,
      ownerId: req.user.userId,
    });
    if (!session) return res.status(404).json({ message: 'Upload session not found' });

    const existingQuestion = await Question.findOne({ questionId: session.questionId });
    if (existingQuestion) {
      session.status = 'complete';
      session.expiresAt = new Date(Date.now() + COMPLETE_SESSION_TTL_MS);
      await session.save();
      return res.status(200).json({
        message: 'Question uploaded successfully',
        questionId: existingQuestion.questionId,
      });
    }
    if (session.status !== 'pending' || session.expiresAt <= new Date()) {
      return res.status(410).json({ message: 'Upload session has expired' });
    }

    const files = getAllUploadFiles(session);
    const metadataResults = await Promise.allSettled(
      files.map((file) => getS3ObjectMetadata(file.key))
    );
    const missingObject = metadataResults.some((result) =>
      result.status === 'rejected' &&
      ['NotFound', 'NoSuchKey', '404'].includes(result.reason?.name)
    );
    if (missingObject) {
      return res.status(400).json({ message: 'One or more uploaded files are missing' });
    }
    const metadataFailure = metadataResults.find((result) => result.status === 'rejected');
    if (metadataFailure) throw metadataFailure.reason;

    const metadata = metadataResults.map((result) => result.value);
    const invalidUpload = metadata.findIndex((item, index) =>
      item.ContentLength !== files[index].size ||
      item.ContentType?.toLowerCase() !== files[index].contentType
    );
    if (invalidUpload !== -1) {
      return res.status(400).json({ message: 'An uploaded file is missing or does not match its reservation' });
    }

    const storedFiles = await copySessionFilesToQuestion(session);
    try {
      const question = await Question.create({
        questionId: session.questionId,
        title: session.title,
        difficulty: session.difficulty,
        timeLimitSec: session.timeLimitSec,
        memoryLimitMb: session.memoryLimitMb,
        uploadedBy: session.ownerId,
        testCases: storedFiles.testCases,
        sampleTestCase: storedFiles.sampleTestCases,
        tags: session.tags,
        descriptionFileKey: storedFiles.description,
      });
      session.status = 'complete';
      session.expiresAt = new Date(Date.now() + COMPLETE_SESSION_TTL_MS);
      try {
        await session.save();
      } catch (sessionError) {
        console.error('Question saved but upload session could not be marked complete:', sessionError);
      }
      try {
        await deleteS3Objects(files.map((file) => file.key));
      } catch (cleanupError) {
        console.error('Question saved but temporary upload cleanup failed:', cleanupError);
      }
      return res.status(201).json({
        message: 'Question uploaded successfully',
        questionId: question.questionId,
      });
    } catch (error) {
      try {
        await deleteS3Objects(storedFiles.finalKeys);
      } catch (cleanupError) {
        console.error('Failed to clean up question objects after database error:', cleanupError);
      }
      throw error;
    }
  } catch (error) {
    console.error('Question upload completion failed:', error);
    return res.status(500).json({ message: 'Could not save uploaded question' });
  }
};

export const cancelQuestionUpload = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.uploadId)) {
      return res.status(400).json({ message: 'Invalid upload session ID' });
    }
    const session = await QuestionUpload.findOne({
      _id: req.params.uploadId,
      ownerId: req.user.userId,
    });
    if (!session) return res.status(404).json({ message: 'Upload session not found' });
    if (session.status === 'complete') {
      return res.status(409).json({ message: 'Completed question uploads cannot be cancelled' });
    }

    await deleteS3Objects(getAllUploadFiles(session).map((file) => file.key));
    await session.deleteOne();
    return res.status(204).end();
  } catch (error) {
    console.error('Question upload cancellation failed:', error);
    return res.status(500).json({ message: 'Could not cancel question upload' });
  }
};

export const getQuestionDetails = async (req, res) => {
  try {
    const question = await Question.findOne({ questionId: req.params.id });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const [description, sampleTestCases] = await Promise.all([
      getS3FileContent(question.descriptionFileKey),
      Promise.all(question.sampleTestCase.map(async ({ inputFileKey, outputFileKey }) => {
        const [input, output] = await Promise.all([
          getS3FileContent(inputFileKey),
          getS3FileContent(outputFileKey),
        ]);
        return { input, output };
      })),
    ]);

    return res.json({
      questionId: question.questionId,
      title: question.title,
      difficulty: question.difficulty,
      timeLimitSec: question.timeLimitSec,
      memoryLimitMb: question.memoryLimitMb,
      tags: question.tags,
      description,
      sampleTestCases,
    });
  } catch (error) {
    console.error('Question detail fetch failed:', error);
    return res.status(500).json({ message: 'Failed to load question files' });
  }
};

const deleteQuestionObjects = async (question) => {
  const listedKeys = [];
  let continuationToken;
  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: getS3BucketName(),
      Prefix: `questions/${question.questionId}/`,
      ContinuationToken: continuationToken,
    }));
    listedKeys.push(...(response.Contents || []).map(({ Key }) => Key).filter(Boolean));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const knownKeys = getQuestionObjectKeys(question);
  await deleteS3Objects([...new Set([...listedKeys, ...knownKeys])]);
};

export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({ questionId: req.params.id });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (!question.uploadedBy.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await deleteQuestionObjects(question);
    await question.deleteOne();
    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Question deletion failed:', error);
    return res.status(500).json({ message: 'Failed to delete question' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({ questionId: req.params.id });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (!question.uploadedBy.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { title, difficulty, timeLimitSec, memoryLimitMb, tags, description } = req.body;
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
        return res.status(400).json({ message: 'Title must be 1 to 200 characters' });
      }
      question.title = title.trim();
    }
    if (difficulty !== undefined) {
      const normalizedDifficulty = String(difficulty).toLowerCase();
      if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
        return res.status(400).json({ message: 'Difficulty must be easy, medium, or hard' });
      }
      question.difficulty = normalizedDifficulty;
    }
    if (timeLimitSec !== undefined) {
      const normalizedTimeLimit = Number(timeLimitSec);
      if (![1, 2, 5].includes(normalizedTimeLimit)) {
        return res.status(400).json({ message: 'Time limit must be 1, 2, or 5 seconds' });
      }
      question.timeLimitSec = normalizedTimeLimit;
    }
    if (memoryLimitMb !== undefined) {
      const normalizedMemoryLimit = Number(memoryLimitMb);
      if (![128, 256, 512, 1024].includes(normalizedMemoryLimit)) {
        return res.status(400).json({ message: 'Memory limit must be 128, 256, 512, or 1024 MB' });
      }
      question.memoryLimitMb = normalizedMemoryLimit;
    }
    if (tags !== undefined) question.tags = parseTags(tags);

    let oldDescriptionReference;
    let newDescriptionKey;
    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim() || Buffer.byteLength(description, 'utf8') > MAX_FILE_BYTES) {
        return res.status(400).json({ message: 'Description must be non-empty and no larger than 10 MB' });
      }
      oldDescriptionReference = question.descriptionFileKey;
      newDescriptionKey = `questions/${question.questionId}/${uuidv4()}`;
      await uploadBufferToS3(Buffer.from(description, 'utf8'), newDescriptionKey, 'text/plain');
      question.descriptionFileKey = createS3Reference(newDescriptionKey);
    }

    try {
      await question.save();
    } catch (error) {
      if (newDescriptionKey) {
        try {
          await deleteS3Objects([newDescriptionKey]);
        } catch (cleanupError) {
          console.error('Failed to clean up unreferenced question description:', cleanupError);
        }
      }
      throw error;
    }
    if (oldDescriptionReference) {
      try {
        await deleteS3Objects([getS3ObjectKey(oldDescriptionReference)]);
      } catch (cleanupError) {
        console.error('Question updated but old description cleanup failed:', cleanupError);
      }
    }
    return res.json({ message: 'Question updated' });
  } catch (error) {
    console.error('Question update failed:', error);
    return res.status(500).json({ message: 'Failed to update question' });
  }
};

export const getUserQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ uploadedBy: req.user.userId });
    const results = await Promise.all(questions.map(async (question) => {
      const description = await getS3FileContent(question.descriptionFileKey);
      return {
        questionId: question.questionId,
        title: question.title,
        difficulty: question.difficulty,
        timeLimitSec: question.timeLimitSec,
        memoryLimitMb: question.memoryLimitMb,
        tags: question.tags,
        description: description.split('Input Format:')[0].trim(),
      };
    }));
    return res.json(results);
  } catch (error) {
    console.error('Contributor questions fetch failed:', error);
    return res.status(500).json({ message: 'Could not fetch questions' });
  }
};

export const getQuestionList = async (req, res) => {
  try {
    const questions = await Question.find({}, {
      _id: 0,
      questionId: 1,
      title: 1,
      difficulty: 1,
      tags: 1,
    });
    const user = await User.findById(req.user.userId).select('solvedQuestions');
    const solvedSet = new Set(user?.solvedQuestions || []);

    return res.json(questions.map((question) => ({
      questionId: question.questionId,
      title: question.title,
      difficulty: question.difficulty,
      tags: question.tags,
      solved: solvedSet.has(question.questionId),
    })));
  } catch (error) {
    console.error('Question list fetch failed:', error);
    return res.status(500).json({ message: 'Failed to load questions' });
  }
};
