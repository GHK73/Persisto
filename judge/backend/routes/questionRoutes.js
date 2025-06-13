import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import {
  uploadQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionList,
  getQuestionDetails,
  getUserQuestions
} from '../controller/question.js';
import { authenicate } from '../middleware/authenicate.js';

const router = express.Router();

// Upload question with authentication
router.post('/', authenicate, upload, uploadQuestion);

// Update and delete
router.put('/:id', authenicate, updateQuestion);
router.delete('/:id', authenicate, deleteQuestion);

// Get user-specific questions — this must come BEFORE /:id
router.get('/my-questions', authenicate, getUserQuestions);

// Get all questions (optionally include solved info)
router.get('/', authenicate, getQuestionList);

// Get question by ID — should always be last
router.get('/:id', getQuestionDetails);

export default router;
