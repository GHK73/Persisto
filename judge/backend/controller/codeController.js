import { generateFile } from '../utils/generateFile.js';
import { executeCpp } from '../utils/executeCpp.js';
import { executePython } from '../utils/executePython.js';
import { executeJava } from '../utils/executeJava.js';
import Submission from '../models/submission.js';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/file.js';
import Question from '../models/questions.js';

// Function to run code based on the programming language
export const runCode = async (language, filePath, input) => {
  if (language === 'cpp' || language === 'c++' || language === 'c') {
    return await executeCpp(filePath, input);
  } else if (language === 'python') {
    return await executePython(filePath, input);
  } else if (language === 'java') {
    return await executeJava(filePath, input);
  } else {
    throw new Error('Unsupported language');
  }
};

// Handle code submission
export const submitCode = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { code, language = 'cpp', questionId } = req.body;
  if (!code || !questionId) {
    return res.status(400).json({ success: false, error: 'Code and Question ID required' });
  }

  try {
    // Generate temp file for user's code
    const filePath = await generateFile(language, code);
    console.log('Generated file path:', filePath);

    // Fetch question with its test cases
    const question = await Question.findOne({ questionId });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const failedCases = [];

    // Run code against all test cases
    for (const tc of question.testCases) {
      const inputFilePath = path.join(question.directoryPath, tc.inputFile);
      const outputFilePath = path.join(question.directoryPath, tc.outputFile);

      // Read test case input and expected output
      const inputData = await fs.readFile(inputFilePath, 'utf-8');
      const expectedOutput = await fs.readFile(outputFilePath, 'utf-8');

      console.log(`Running test case ${tc.inputFile}...`);

      let actualOutput;
      try {
        actualOutput = await runCode(language, filePath, inputData);
      } catch (execErr) {
        console.error(`Execution error on ${tc.inputFile}:`, execErr.message);
        failedCases.push(tc.inputFile);
        continue;
      }

      // Normalize outputs (handle line endings, trailing spaces)
      const normalizedExpected = expectedOutput.replace(/\r\n/g, '\n').trim();
      const normalizedActual = actualOutput?.replace(/\r\n/g, '\n').trim();

      if (normalizedActual !== normalizedExpected) {
        console.log(`Test case failed: ${tc.inputFile}`);
        failedCases.push(tc.inputFile);
      }
    }

    const passed = failedCases.length === 0;

    // Save submission record
    const submission = new Submission({
      userId,
      questionId,
      language,
      code,
      passed,
      failedCases,
      timestamp: new Date()
    });
    await submission.save();

    // Update user's solvedQuestions if all test cases passed
    if (passed) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { solvedQuestions: questionId } }
      );
    }

    // Optional: cleanup generated user code file
    try {
      await fs.unlink(filePath);
    } catch (cleanupErr) {
      console.warn('Failed to delete temp code file:', cleanupErr.message);
    }

    return res.json({
      success: true,
      passed,
      message: passed ? 'All test cases passed!' : 'Some test cases failed',
      failedCases
    });
  } catch (err) {
    console.error('submitCode error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Function to get the count of unique questions solved by the user
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
