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

// Get all questions (optionally include solved info if authenticated)
router.get('/', authenicate, getQuestionList);

// Get question by id
router.get('/my-questions', authenicate, getUserQuestions);

// Get question by id — must come after
router.get('/:id', getQuestionDetails);

// PUT /questions/:id
router.put('/:id', authenicate, updateQuestion);


export default router;
