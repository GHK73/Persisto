// --- controllers/questionController.js ---
import Question from '../models/questions.js';
import User from '../models/file.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToS3 } from '../utils/s3Uploader.js';
import s3Client from '../utils/s3Client.js';
import { GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { streamToString } from '../utils/streamToString.js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const BUCKET = process.env.S3_BUCKET_NAME;

export const uploadQuestion = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, difficulty, tags } = req.body;
    const questionId = uuidv4();

    if (!req.files?.description?.length) {
      return res.status(400).json({ message: 'Missing description file' });
    }

    const descFile = req.files.description[0];
    const descriptionKey = `questions/${questionId}/description-${Date.now()}${path.extname(descFile.originalname)}`;
    await uploadFileToS3(descFile.path, descriptionKey);

    const inputFiles = req.files.inputFiles || [];
    const outputFiles = req.files.outputFiles || [];

    if (inputFiles.length !== outputFiles.length) {
      return res.status(400).json({ message: 'Input/output test case count mismatch' });
    }

    const testCases = [];
    for (let i = 0; i < inputFiles.length; i++) {
      const inputKey = `questions/${questionId}/input-${uuidv4()}${path.extname(inputFiles[i].originalname)}`;
      const outputKey = `questions/${questionId}/output-${uuidv4()}${path.extname(outputFiles[i].originalname)}`;

      await uploadFileToS3(inputFiles[i].path, inputKey);
      await uploadFileToS3(outputFiles[i].path, outputKey);

      testCases.push({ inputFileKey: inputKey, outputFileKey: outputKey });
    }

    const tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;

    const question = new Question({
      questionId,
      title,
      difficulty: difficulty.toLowerCase(),
      uploadedBy: userId,
      testCases,
      tags: tagsArray,
      descriptionFileKey: descriptionKey
    });

    await question.save();
    res.status(201).json({ message: 'Question uploaded', questionId });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload question' });
  }
};

const getDescriptionFromS3 = async (s3Key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  return await streamToString(response.Body);
};

export const getQuestionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findOne({ questionId: id });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    let description = 'Not available';
    if (question.descriptionFileKey) {
      try {
        description = await getDescriptionFromS3(question.descriptionFileKey);
      } catch (err) {
        console.warn('Failed to load description:', err.message);
      }
    }

    res.json({ ...question.toObject(), description });
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch question' });
  }
};

const deleteS3Folder = async (prefix) => {
  const listed = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  if (!listed.Contents || listed.Contents.length === 0) return;
  for (const item of listed.Contents) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: item.Key }));
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const question = await Question.findOne({ questionId: id });

    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.uploadedBy.toString() !== userId) return res.status(403).json({ message: 'Unauthorized' });

    await deleteS3Folder(`questions/${id}/`);
    await question.deleteOne();

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const question = await Question.findOne({ questionId: id });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.uploadedBy.toString() !== userId) return res.status(403).json({ message: 'Unauthorized' });

    const { title, difficulty, tags } = req.body;

    if (title) question.title = title;
    if (difficulty) question.difficulty = difficulty.toLowerCase();
    if (tags) {
      const tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
      question.tags = tagsArray;
    }

    if (req.files?.description?.length) {
      const descFile = req.files.description[0];
      const newDescKey = `questions/${id}/description-${Date.now()}${path.extname(descFile.originalname)}`;
      await uploadFileToS3(descFile.path, newDescKey);
      question.descriptionFileKey = newDescKey;
    }

    if (req.files?.inputFiles && req.files?.outputFiles) {
      const inputFiles = req.files.inputFiles;
      const outputFiles = req.files.outputFiles;

      if (inputFiles.length !== outputFiles.length) {
        return res.status(400).json({ message: 'Input/output file mismatch' });
      }

      const testCases = [];
      for (let i = 0; i < inputFiles.length; i++) {
        const inputKey = `questions/${id}/input-${uuidv4()}${path.extname(inputFiles[i].originalname)}`;
        const outputKey = `questions/${id}/output-${uuidv4()}${path.extname(outputFiles[i].originalname)}`;
        await uploadFileToS3(inputFiles[i].path, inputKey);
        await uploadFileToS3(outputFiles[i].path, outputKey);
        testCases.push({ inputFileKey: inputKey, outputFileKey: outputKey });
      }

      question.testCases = testCases;
    }

    await question.save();
    res.json({ message: 'Question updated' });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ message: 'Failed to update question' });
  }
};

export const getUserQuestions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const questions = await Question.find({ uploadedBy: userId });

    const results = await Promise.all(
      questions.map(async (q) => {
        let shortDesc = 'No preview';
        if (q.descriptionFileKey) {
          try {
            const full = await getDescriptionFromS3(q.descriptionFileKey);
            shortDesc = full.split('Input Format:')[0].trim();
          } catch (e) {
            console.warn(`Error fetching preview: ${e.message}`);
          }
        }
        return {
          questionId: q.questionId,
          title: q.title,
          difficulty: q.difficulty,
          tags: q.tags,
          description: shortDesc
        };
      })
    );

    res.json(results);
  } catch (error) {
    console.error('Fetch user questions error:', error);
    res.status(500).json({ message: 'Could not fetch user questions' });
  }
};

export const getQuestionList = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const questions = await Question.find({}, { _id: 0, questionId: 1, title: 1, difficulty: 1, tags: 1 });

    let solvedSet = new Set();
    if (userId) {
      const user = await User.findById(userId).select('solvedQuestions');
      if (user?.solvedQuestions) solvedSet = new Set(user.solvedQuestions);
    }

    const formatted = questions.map((q) => ({
      questionId: q.questionId,
      title: q.title,
      difficulty: q.difficulty,
      tags: q.tags,
      solved: solvedSet.has(q.questionId),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ message: 'Failed to load questions' });
  }
};
