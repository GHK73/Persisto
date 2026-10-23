// controllers/codeController.js

import { runInSandbox } from '../utils/runInSandbox.js';
import Submission from '../models/submission.js';
import mongoose from 'mongoose';
import User from '../models/file.js';
import Question from '../models/questions.js';
import {
  createS3Reference,
  getS3FileContent,
  uploadBufferToS3,
} from '../utils/s3Uploader.js';
import { v4 as uuidv4 } from 'uuid';
import genAI from '../utils/geminiClient.js';

export const runCode = async (req, res) => {
  const { code, language, input = '', questionId } = req.body;

  if (
    typeof code !== 'string' ||
    !code ||
    Buffer.byteLength(code, 'utf8') > 256 * 1024 ||
    typeof language !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      error: 'Code and language are required; code must not exceed 256 KB.',
    });
  }

  try {
    const lang = language.trim().toLowerCase();
    if (!['cpp', 'c++', 'c', 'python', 'py', 'java'].includes(lang)) {
      return res.status(400).json({ success: false, error: `Unsupported language: ${lang}` });
    }
    if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Input must be text no larger than 1 MB.' });
    }
    const question = questionId
      ? await Question.findOne({ questionId }).select('timeLimitSec memoryLimitMb')
      : null;
    if (questionId && !question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const result = await runInSandbox({
      code,
      language: lang,
      inputs: [typeof input === 'string' ? input : ''],
      timeLimitMs: (question?.timeLimitSec || 2) * 1000,
      memoryLimitMb: question?.memoryLimitMb || 256,
    });

    if (result.status === 'compile_error') {
      return res.json({ success: false, status: result.status, error: result.error });
    }
    if (result.status === 'memory_limit_exceeded') {
      return res.json({
        success: false,
        status: result.status,
        error: result.error || 'Memory limit exceeded',
      });
    }
    const runResult = result.results?.[0];
    if (!runResult) throw new Error('Sandbox returned no execution result');
    return res.json({
      success: runResult.status === 'accepted',
      status: runResult.status,
      output: runResult.output,
      error: runResult.error,
      timeMs: runResult.timeMs,
    });
  } catch (err) {
    console.error('runCode error:', err);
    return res.status(503).json({ success: false, error: err.message });
  }
};


export const submitCode = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { code, language = 'cpp', questionId } = req.body;
  if (typeof code !== 'string' || !code || Buffer.byteLength(code, 'utf8') > 256 * 1024 || !questionId) {
    return res.status(400).json({ success: false, error: 'Code and Question ID required' });
  }

  try {
    const lang = language.trim().toLowerCase();
    const supportedLangs = ['cpp', 'c++', 'c', 'python', 'py', 'java'];
    if (!supportedLangs.includes(lang)) {
      return res.status(400).json({ success: false, error: `Unsupported language: ${lang}` });
    }

    const question = await Question.findOne({ questionId });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const failedCases = [];

    if (question.testCases.length === 0) {
      return res.status(400).json({ success: false, error: 'Question has no judge test cases' });
    }
    const testData = await Promise.all(question.testCases.map(async (testCase) => {
      const [input, expected] = await Promise.all([
        getS3FileContent(testCase.inputFileKey),
        getS3FileContent(testCase.outputFileKey),
      ]);
      return { input, expected: expected.replace(/\r\n/g, '\n').trim() };
    }));
    const execution = await runInSandbox({
      code,
      language: lang,
      inputs: testData.map(({ input }) => input),
      timeLimitMs: question.timeLimitSec * 1000,
      memoryLimitMb: question.memoryLimitMb,
    });

    let status = 'accepted';
    if (execution.status === 'compile_error') {
      status = 'compile_error';
      failedCases.push('compilation');
    } else if (execution.status === 'memory_limit_exceeded') {
      status = 'memory_limit_exceeded';
      failedCases.push('memory-limit');
    } else if (execution.status !== 'completed' || execution.results?.length !== testData.length) {
      throw new Error('Sandbox returned an incomplete execution result');
    } else {
      for (const [index, result] of execution.results.entries()) {
        const expected = testData[index].expected;
        const actual = result.output?.replace(/\r\n/g, '\n').trim();
        if (result.status !== 'accepted') {
          failedCases.push(`test-case-${index + 1}`);
          if (status === 'accepted') status = result.status === 'output_limit_exceeded'
            ? 'output_limit_exceeded'
            : result.status;
        } else if (expected !== actual) {
          failedCases.push(`test-case-${index + 1}`);
          if (status === 'accepted') status = 'wrong_answer';
        }
      }
    }
    const passed = status === 'accepted';
    const fileKey = `submissions/${userId}/${uuidv4()}.${lang}`;
    await uploadBufferToS3(Buffer.from(code, 'utf8'), fileKey, 'text/plain');

    const submission = new Submission({
      userId,
      questionId,
      language: lang,
      code,
      codeFileKey: createS3Reference(fileKey),
      passed,
      status,
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
      status,
      message: passed ? '✅ All test cases passed!' : '❌ Some test cases failed.',
      failedCases,
      compileError: execution.status === 'compile_error' ? execution.error : undefined,
    });
  } catch (err) {
    console.error('submitCode error:', err);
    return res.status(503).json({ success: false, error: err.message });
  }
};



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
