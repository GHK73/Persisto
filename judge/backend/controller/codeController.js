import { generateFile } from '../utils/generateFile.js';
import { executeCpp } from '../utils/executeCpp.js';
import { executePython } from '../utils/executePython.js';
import { executeJava } from '../utils/executeJava.js';
import Submission from '../models/submission.js';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

const runCodeByLanguage = async (language, filePath, input) => {
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

export const runCode = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { code, language = 'cpp', input = '' } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'Code is required' });

  try {
    const filePath = generateFile(language, code);
    const output = await runCodeByLanguage(language, filePath, input);
    res.json({ success: true, output });
  } catch (err) {
    console.error('runCode error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    const filePath = generateFile(language, code);
    const questionPath = path.resolve('questions', questionId);
    const testCases = await fs.readdir(questionPath);

    const inputFiles = testCases.filter(f => f.startsWith('input') && f.endsWith('.txt'));
    const failedCases = [];

    for (const inputFile of inputFiles) {
      const index = inputFile.match(/\d+/)?.[0];
      const outputFile = `output${index}.txt`;

      const inputData = await fs.readFile(path.join(questionPath, inputFile), 'utf-8');
      const expectedOutput = await fs.readFile(path.join(questionPath, outputFile), 'utf-8');
      const actualOutput = await runCodeByLanguage(language, filePath, inputData);

      if (actualOutput.trim() !== expectedOutput.trim()) {
        failedCases.push(inputFile);
      }
    }

    const passed = failedCases.length === 0;

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

    res.json({
      success: true,
      passed,
      message: passed ? 'All test cases passed!' : 'Some test cases failed',
      failedCases
    });
  } catch (err) {
    console.error('submitCode error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    res.json({ success: true, uniqueQuestionsSolved: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
