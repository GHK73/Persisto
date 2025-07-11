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

router.post('/', authenicate, upload, uploadQuestion);

router.put('/:id', authenicate, updateQuestion);
router.delete('/:id', authenicate, deleteQuestion);

router.get('/my-questions', authenicate, getUserQuestions);

router.get('/', authenicate, getQuestionList);

router.get('/:id', getQuestionDetails);

export default router;
