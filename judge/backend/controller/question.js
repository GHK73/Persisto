import fs from 'fs';
import path from 'path';
import Question from '../models/questions.js';
import {v4 as uuidv4} from 'uuid';

const basePath = path.resolve('questions');

export const uploadQuestion = async (req, res)=>{
    try{
        const {title,difficulty,tags} = req.body;
        const questionId = uuidv4();
        const questionDir = path.join(basePath, questionId);
        fs.mkdirSync(questionDir, {recursive: true});
        for(const file of req.files){
            const dest = path.join(questionDir,file.originalname);
            fs.renameSync(file.path,dest);
        }

        const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag=>tag.trim()):tags;
        const newQuestion = new Question({
            questionId,
            title,
            difficulty,
            tags: tagsArray,
            directoryPath: questionDir,
            uploadedBy: userId,
        });
        await newQuestion.save();
    res.status(201).json({ message: 'Question uploaded successfully', questionId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload question' });
  }
};

export const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const question = await Question.findOne({ questionId: id });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.uploadedBy.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { title, difficulty, tags } = req.body;
    if (title) question.title = title;
    if (difficulty) question.difficulty = difficulty;
    if (tags) question.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;

    await question.save();
    res.status(200).json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Update failed' });
  }
};

export const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const question = await Question.findOne({ questionId: id });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.uploadedBy.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete directory recursively
    fs.rmSync(question.directoryPath, { recursive: true, force: true });

    await question.deleteOne();
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

export const getQuestionList = async (req, res) => {
  try {
    const questions = await Question.find({}, { _id: 0, questionId: 1, title: 1, difficulty: 1, tags: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

export const getQuestionDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const question = await Question.findOne({ questionId: id });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const descPath = path.join(question.directoryPath, 'description.txt');
    const description = fs.existsSync(descPath) ? fs.readFileSync(descPath, 'utf-8') : 'No description';

    res.json({ ...question.toObject(), description });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch question details' });
  }
};