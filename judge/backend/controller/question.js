// controllers/questionController.js
import Question from '../models/questions.js';
import User from '../models/file.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToS3 } from '../utils/s3Uploader.js';
import s3Client from '../utils/s3Client.js';
import { GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {streamToString} from '../utils/streamToString.js';

const BUCKET = process.env.S3_BUCKET_NAME;

// --- Upload Question ---
export const uploadQuestion = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const { title, difficulty, tags } = req.body;
    const questionId = uuidv4();

    if (!req.files?.description || req.files.description.length === 0) {
      return res.status(400).json({ message: 'Missing description file' });
    }

    const descFileOriginal = req.files.description[0];
    const descExt = path.extname(descFileOriginal.originalname);
    const descriptionFileName = questionId + descExt;
    const descriptionS3Key = `questions/${questionId}/${descriptionFileName}`;

    await uploadFileToS3(descFileOriginal.path, descriptionS3Key);

    if (!req.files?.inputFiles || !req.files?.outputFiles) {
      return res.status(400).json({ message: 'Missing input or output test case files' });
    }

    const inputFiles = req.files.inputFiles;
    const outputFiles = req.files.outputFiles;
    if (inputFiles.length !== outputFiles.length) {
      return res.status(400).json({ message: 'Input and output test files count mismatch' });
    }

    const testCases = [];
    for (let i = 0; i < inputFiles.length; i++) {
      const inputKey = `questions/${questionId}/${uuidv4()}${path.extname(inputFiles[i].originalname)}`;
      const outputKey = `questions/${questionId}/${uuidv4()}${path.extname(outputFiles[i].originalname)}`;

      await uploadFileToS3(inputFiles[i].path, inputKey);
      await uploadFileToS3(outputFiles[i].path, outputKey);

      testCases.push({ inputFile: inputKey, outputFile: outputKey });
    }

    const tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;

    const newQuestion = new Question({
      questionId,
      title,
      difficulty: difficulty.toLowerCase(),
      tags: tagsArray,
      uploadedBy: userId,
      testCases,
      descriptionFile: descriptionS3Key,
    });

    await newQuestion.save();
    res.status(201).json({ message: 'Question uploaded successfully', questionId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload question' });
  }
};

// --- Get Question Details ---
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

    let description = 'No description';
    if (question.descriptionFile) {
      try {
        description = await getDescriptionFromS3(question.descriptionFile);
      } catch (e) {
        console.warn(`Could not read description from S3: ${e.message}`);
      }
    }

    res.json({
      ...question.toObject(),
      description
    });
  } catch (error) {
    console.error('Fetch details error:', error);
    res.status(500).json({ message: 'Failed to fetch question details' });
  }
};

// --- Delete Question and S3 Files ---
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
    res.status(200).json({ message: 'Question and files deleted successfully' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

// --- User's Uploaded Questions ---
export const getUserQuestions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const questions = await Question.find({ uploadedBy: userId });

    const results = await Promise.all(
      questions.map(async (q) => {
        let description = 'No description';
        if (q.descriptionFile) {
          try {
            const full = await getDescriptionFromS3(q.descriptionFile);
            description = full.split('Input Format:')[0].trim();
          } catch (err) {
            console.warn(`Could not fetch description: ${err.message}`);
          }
        }
        return {
          questionId: q.questionId,
          title: q.title,
          difficulty: q.difficulty,
          tags: q.tags,
          description
        };
      })
    );

    res.json(results);
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

// --- Get All Questions (with Solved Status if Authenticated) ---
export const getQuestionList = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const questions = await Question.find({}, { _id: 0, questionId: 1, title: 1, difficulty: 1, tags: 1 });

    let solvedIds = new Set();
    if (userId) {
      const user = await User.findById(userId).select('solvedQuestions');
      if (user?.solvedQuestions) solvedIds = new Set(user.solvedQuestions);
    }

    const formatted = questions.map((q) => ({
      questionId: q.questionId,
      title: q.title,
      difficulty: q.difficulty,
      tags: q.tags,
      solved: solvedIds.has(q.questionId),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};


import path from 'path';
import fs from 'fs';

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

    // --- Update description if a new file is uploaded
    if (req.files?.description?.length) {
      const descFile = req.files.description[0];
      const descExt = path.extname(descFile.originalname);
      const descriptionS3Key = `questions/${id}/${uuidv4()}${descExt}`;
      await uploadFileToS3(descFile.path, descriptionS3Key);
      question.descriptionFile = descriptionS3Key;
    }

    // --- Optionally update test cases
    if (req.files?.inputFiles && req.files?.outputFiles) {
      const inputFiles = req.files.inputFiles;
      const outputFiles = req.files.outputFiles;

      if (inputFiles.length !== outputFiles.length) {
        return res.status(400).json({ message: 'Input/output file count mismatch' });
      }

      const testCases = [];
      for (let i = 0; i < inputFiles.length; i++) {
        const inputKey = `questions/${id}/${uuidv4()}${path.extname(inputFiles[i].originalname)}`;
        const outputKey = `questions/${id}/${uuidv4()}${path.extname(outputFiles[i].originalname)}`;
        await uploadFileToS3(inputFiles[i].path, inputKey);
        await uploadFileToS3(outputFiles[i].path, outputKey);
        testCases.push({ inputFile: inputKey, outputFile: outputKey });
      }

      question.testCases = testCases;
    }

    await question.save();
    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Failed to update question' });
  }
};
