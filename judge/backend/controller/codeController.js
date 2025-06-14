import { generateFile } from '../utils/generateFile.js';
import { executeCpp } from '../utils/executeCpp.js';
import { executePython } from '../utils/executePython.js';
import { executeJava } from '../utils/executeJava.js';
import Submission from '../models/submission.js';
import mongoose from 'mongoose';
import User from '../models/file.js';
import Question from '../models/questions.js';
import { getS3FileContent, uploadFileToS3 } from '../utils/s3Uploader.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

export const runCode = async (language, filePath, input) => {
  switch (language.toLowerCase()) {
    case 'cpp':
    case 'c++':
    case 'c':
      return await executeCpp(filePath, input);
    case 'python':
      return await executePython(filePath, input);
    case 'java':
      return await executeJava(filePath, input);
    default:
      throw new Error('Unsupported language');
  }
};

export const submitCode = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { code, language = 'cpp', questionId } = req.body;
  if (!code || !questionId) {
    return res.status(400).json({ success: false, error: 'Code and Question ID required' });
  }

  try {
    const filePath = await generateFile(language, code);
    const question = await Question.findOne({ questionId });
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

    const failedCases = [];
    for (const tc of question.testCases) {
      try {
        const inputData = await getS3FileContent(tc.inputFileKey);
        const expectedOutput = await getS3FileContent(tc.outputFileKey);
        const actualOutput = await runCode(language, filePath, inputData);

        const expected = expectedOutput?.replace(/\r\n/g, '\n').trim();
        const actual = actualOutput?.replace(/\r\n/g, '\n').trim();

        if (expected !== actual) failedCases.push(tc.inputFileKey);
      } catch (err) {
        console.error(`Test case ${tc.inputFileKey} failed:`, err.message);
        failedCases.push(tc.inputFileKey);
      }
    }

    const passed = failedCases.length === 0;

    // Upload just the code string to S3, not the file path
    const fileKey = `submissions/${userId}/${uuidv4()}.${language}`;
    await uploadFileToS3(code, fileKey, 'text/plain');

    const submission = new Submission({
      userId,
      questionId,
      language,
      code,
      codeFileKey: fileKey,
      passed,
      failedCases,
      timestamp: new Date(),
    });
    await submission.save();

    if (passed) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { solvedQuestions: questionId } }
      );
    }

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Temp file cleanup failed:', err.message);
    }

    return res.json({
      success: true,
      passed,
      message: passed ? 'All test cases passed!' : 'Some test cases failed',
      failedCases,
    });
  } catch (err) {
    console.error('submitCode error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};



export const getUniqueQuestionsSolved = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const solved = await Submission.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), passed: true } },
      { $group: { _id: '$questionId' } },
      { $count: 'uniqueSolved' }
    ]);

    const count = solved.length > 0 ? solved[0].uniqueSolved : 0;
    return res.json({ success: true, uniqueQuestionsSolved: count });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
