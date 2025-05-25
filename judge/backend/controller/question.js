import fs from 'fs/promises';
import path from 'path';
import Question from '../models/questions.js';
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

    // Gather all files from multer fields
    const allFiles = [
      ...(req.files.description || []),
      ...(req.files.inputFiles || []),
      ...(req.files.outputFiles || [])
    ];

    for (const file of allFiles) {
      const destPath = path.join(questionDir, file.originalname);
      await fs.rename(file.path, destPath);

      // Detect description file based on field name
      if (file.fieldname === 'description') {
        descriptionFile = file.originalname;
      }

      // Detect test cases by input file pattern
      const match = file.originalname.match(/^input(\d+)\.txt$/);
      if (match) {
        const index = match[1];
        const inputFile = `input${index}.txt`;
        const outputFile = `output${index}.txt`;
        const outputPath = path.join(questionDir, outputFile);
        try {
          await fs.access(outputPath); // check if output file exists
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

// --- Get All Questions ---
export const getQuestionList = async (req, res) => {
  try {
    const questions = await Question.find({}, {
      _id: 0,
      questionId: 1,
      title: 1,
      difficulty: 1,
      tags: 1
    });
    res.json(questions);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

// --- Get Single Question with Description ---
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
