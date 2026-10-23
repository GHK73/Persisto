import express from 'express';
import {
  cancelQuestionUpload,
  completeQuestionUpload,
  createQuestionUpload,
  updateQuestion,
  deleteQuestion,
  getQuestionList,
  getQuestionDetails,
  getUserQuestions
} from '../controller/question.js';
import { authenicate } from '../middleware/authenicate.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

router.post('/uploads', authenicate, isAdmin, createQuestionUpload);
router.post('/uploads/:uploadId/complete', authenicate, isAdmin, completeQuestionUpload);
router.delete('/uploads/:uploadId', authenicate, isAdmin, cancelQuestionUpload);

router.put('/:id', authenicate, updateQuestion);
router.delete('/:id', authenicate, deleteQuestion);

router.get('/my-questions', authenicate, getUserQuestions);

router.get('/', authenicate, getQuestionList);

router.get('/:id', getQuestionDetails);

export default router;
