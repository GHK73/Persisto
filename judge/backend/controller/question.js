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
    const questionId = uuidv4();
    const questionDir = path.join(basePath, questionId);
    await fs.mkdir(questionDir, { recursive: true });

    const testCases = [];
    let descriptionFile = null;

    const allFiles = [
      ...(req.files.description || []),
      ...(req.files.inputFiles || []),
      ...(req.files.outputFiles || [])
    ];

    for (const file of allFiles) {
      const destPath = path.join(questionDir, file.originalname);
      await fs.rename(file.path, destPath);

      if (file.fieldname === 'description') {
        descriptionFile = file.originalname;
      }

      const match = file.originalname.match(/^input(\d+)\.txt$/);
      if (match) {
        const index = match[1];
        const inputFile = `input${index}.txt`;
        const outputFile = `output${index}.txt`;
        const outputPath = path.join(questionDir, outputFile);
        try {
          await fs.access(outputPath);
          testCases.push({ inputFile, outputFile });
        } catch {}
      }
    }

    if (!descriptionFile) {
      return res.status(400).json({ message: 'Missing description file' });
    }

    const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;

    const newQuestion = new Question({
      questionId,
      title,
      difficulty: difficulty.toLowerCase(),
      tags: tagsArray,
      directoryPath: questionDir,
      uploadedBy: userId,
      testCases,
      descriptionFile
    });

    await newQuestion.save();

    console.log('Question saved successfully with questionId:', questionId);

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
    if (tags) question.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;

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

    await fs.rm(question.directoryPath, { recursive: true, force: true });
    await question.deleteOne();

    res.status(200).json({ message: 'Question deleted successfully' });
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
