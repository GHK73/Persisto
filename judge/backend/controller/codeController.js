// controllers/codeController.js

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
import genAI from '../utils/geminiClient.js';

/**
 * Executes code using the appropriate executor based on language.
 */
export const runCodeExecutor = async (language, filePath, input) => {
  const lang = language.trim().toLowerCase();
  switch (lang) {
    case 'cpp':
    case 'c++':
    case 'c':
      return await executeCpp(filePath, input);
    case 'python':
    case 'py':
      return await executePython(filePath, input);
    case 'java':
      return await executeJava(filePath, input);
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }
};

/**
 * Endpoint to temporarily run code without saving submission.
 */
export const runCode = async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, error: 'Code and language are required.' });
  }

  try {
    const lang = language.trim().toLowerCase();
    const filePath = await generateFile(lang, code);

    const output = await runCodeExecutor(lang, filePath, input);
    await fs.unlink(filePath); // Clean up temp file

    return res.json({ success: true, output });
  } catch (err) {
    console.error('runCode error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Handles code submission with test case evaluation.
 */
export const submitCode = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { code, language = 'cpp', questionId } = req.body;
  if (!code || !questionId) {
    return res.status(400).json({ success: false, error: 'Code and Question ID required' });
  }

  let filePath = null;

  try {
    const lang = language.trim().toLowerCase();
    const supportedLangs = ['cpp', 'c++', 'c', 'python', 'py', 'java'];
    if (!supportedLangs.includes(lang)) {
      return res.status(400).json({ success: false, error: `Unsupported language: ${lang}` });
    }

    filePath = await generateFile(lang, code);
    const question = await Question.findOne({ questionId });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const failedCases = [];

    let executor;
    switch (lang) {
      case 'cpp':
      case 'c++':
      case 'c':
        executor = await executeCpp(filePath, null, true);
        break;
      case 'python':
      case 'py':
        executor = async (input) => await executePython(filePath, input);
        break;
      case 'java':
        executor = await executeJava(filePath, null, true);
        break;
    }

    for (const tc of question.testCases) {
      try {
        const inputData = await getS3FileContent(tc.inputFileKey);
        const expectedOutput = await getS3FileContent(tc.outputFileKey);

        const actualOutput =
          typeof executor === 'function' ? await executor(inputData) : await executor.run(inputData);

        const expected = expectedOutput?.replace(/\r\n/g, '\n').trim();
        const actual = actualOutput?.replace(/\r\n/g, '\n').trim();

        if (expected !== actual) {
          failedCases.push(tc.inputFileKey);
        }
      } catch (err) {
        console.error(`Test case ${tc.inputFileKey} failed:`, err.message);
        failedCases.push(tc.inputFileKey);
      }
    }

    const passed = failedCases.length === 0;
    const fileKey = `submissions/${userId}/${uuidv4()}.${lang}`;
    await uploadFileToS3(code, fileKey, 'text/plain');

    const submission = new Submission({
      userId,
      questionId,
      language: lang,
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

    return res.json({
      success: true,
      passed,
      message: passed ? '✅ All test cases passed!' : '❌ Some test cases failed.',
      failedCases,
    });
  } catch (err) {
    console.error('submitCode error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('Failed to clean up temp file:', filePath, err.message);
      }
    }
  }
};



/**
 * Returns number of unique solved questions by the user.
 */
export const getUniqueQuestionsSolved = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

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

/**
 * AI-based code review using Gemini model.
 */
export const reviewCode = async (req, res) => {
  const { code, language, questionTitle, questionDescription } = req.body;

  if (!code || !language || !questionTitle || !questionDescription) {
    return res.status(400).json({
      success: false,
      error: 'Code, language, question title, and description are required.',
    });
  }

  try {
    const model = genAI.getGenerativeModel({
  model: 'models/gemini-1.5-flash', 
});


    const prompt = `
You are an expert coding mentor.
Review the following ${language} code written to solve the given question.
Offer constructive feedback on correctness, code quality, performance, edge cases, and best practices.
Avoid restating the prompt. Keep review clear, structured, and concise.

---
🧾 Question Title: ${questionTitle}

📋 Description:
${questionDescription}

---
🧑‍💻 Code:
${code}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const review = response.text();

    res.json({ success: true, review });
  } catch (err) {
    console.error('Gemini Review Error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate code review.' });
  }
};
