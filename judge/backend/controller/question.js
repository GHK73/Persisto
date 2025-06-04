import fs from 'fs/promises';
import path from 'path';
import Question from '../models/questions.js';
import User from '../models/file.js';
import { v4 as uuidv4 } from 'uuid';

const basePath = path.resolve('questions');

// --- Upload Question ---
export const uploadQuestion = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const { title, difficulty, tags } = req.body;

    // Generate a UUID for questionId and folder
    const questionId = uuidv4();
    const questionDir = path.join(basePath, questionId);
    await fs.mkdir(questionDir, { recursive: true });

    // --- Description file ---
    if (!req.files?.description || req.files.description.length === 0) {
      return res.status(400).json({ message: 'Missing description file' });
    }
    // Description file must be renamed with questionId + original extension
    const descFileOriginal = req.files.description[0];
    const descExt = path.extname(descFileOriginal.originalname);
    const descriptionFileName = questionId + descExt;
    const descDestPath = path.join(questionDir, descriptionFileName);
    await fs.rename(descFileOriginal.path, descDestPath);

    // --- Test cases ---
    if (!req.files?.inputFiles || !req.files?.outputFiles) {
      return res.status(400).json({ message: 'Missing input or output test case files' });
    }
    const inputFiles = req.files.inputFiles;
    const outputFiles = req.files.outputFiles;

    if (inputFiles.length !== outputFiles.length) {
      return res.status(400).json({ message: 'Input and output test files count mismatch' });
    }

    // Helper to rename any file with new UUID + ext in the question folder
    const renameFileWithUUID = async (file) => {
      const ext = path.extname(file.originalname);
      const newName = uuidv4() + ext;
      const destPath = path.join(questionDir, newName);
      await fs.rename(file.path, destPath);
      return newName;
    };

    const testCases = [];
    for (let i = 0; i < inputFiles.length; i++) {
      const inputUUIDName = await renameFileWithUUID(inputFiles[i]);
      const outputUUIDName = await renameFileWithUUID(outputFiles[i]);
      testCases.push({
        inputFile: inputUUIDName,
        outputFile: outputUUIDName,
      });
    }

    // Normalize tags to array
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;

    // Save question metadata in DB
    const newQuestion = new Question({
      questionId,
      title,
      difficulty: difficulty.toLowerCase(),
      tags: tagsArray,
      directoryPath: questionDir,
      uploadedBy: userId,
      testCases,
      descriptionFile: descriptionFileName, // SAME UUID as questionId + ext
    });

    await newQuestion.save();

    console.log('Question uploaded successfully with questionId:', questionId);
    res.status(201).json({ message: 'Question uploaded successfully', questionId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload question' });
  }
};

// --- Update Question ---
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
    if (tags) question.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;

    await question.save();
    res.status(200).json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Update failed' });
  }
};

// --- Delete Question ---
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const question = await Question.findOne({ questionId: id });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.uploadedBy.toString() !== userId) return res.status(403).json({ message: 'Unauthorized' });

    // Delete question directory and files
    try {
      await fs.rm(question.directoryPath, { recursive: true, force: true });
      console.log(`Deleted directory: ${question.directoryPath}`);
    } catch (fsErr) {
      console.warn(`Failed to delete directory ${question.directoryPath}:`, fsErr.message);
      return res.status(500).json({ message: 'Failed to delete question files' });
    }

    await question.deleteOne();
    res.status(200).json({ message: 'Question and files deleted successfully' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

// --- Get Question Details ---
export const getQuestionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findOne({ questionId: id });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    let description = 'No description';
    if (question.descriptionFile) {
      try {
        const descPath = path.join(question.directoryPath, question.descriptionFile);
        description = await fs.readFile(descPath, 'utf-8');
      } catch (e) {
        console.warn(`Could not read description file: ${e.message}`);
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

// --- Get Logged-In User's Uploaded Questions ---
export const getUserQuestions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const questions = await Question.find(
      { uploadedBy: userId },
      {
        _id: 0,
        questionId: 1,
        title: 1,
        difficulty: 1,
        tags: 1,
        descriptionFile: 1,
        directoryPath: 1,
      }
    );

    const questionsWithDesc = await Promise.all(
      questions.map(async (q) => {
        let description = 'No description available.';
        if (q.descriptionFile) {
          try {
            const descPath = path.join(q.directoryPath, q.descriptionFile);
            let fullDesc = await fs.readFile(descPath, 'utf-8');
            description = fullDesc.split('Input Format:')[0].trim();
          } catch (err) {
            console.warn(`Failed to read description file: ${err.message}`);
          }
        }
        return {
          questionId: q.questionId,
          title: q.title,
          difficulty: q.difficulty,
          tags: q.tags,
          description,
        };
      })
    );

    res.json(questionsWithDesc);
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

// --- Get All Questions with Optional Solved Status ---
export const getQuestionList = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const questions = await Question.find({}, {
      _id: 0,
      questionId: 1,
      title: 1,
      difficulty: 1,
      tags: 1,
    });

    let solvedIds = new Set();
    if (userId) {
      const user = await User.findById(userId).select('solvedQuestions');
      if (user && user.solvedQuestions) {
        solvedIds = new Set(user.solvedQuestions);
      }
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
