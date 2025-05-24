import express from 'express';
import multer from 'multer';
import {
  uploadQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionList,
  getQuestionDetails
} from '../controller/question.js';
import { authenicate } from '../middleware/authenicate.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const upload = multer({ dest: 'temp/' });

router.post('/questions', authenicate, upload.array('files'), uploadQuestion);
router.put('/questions/:id', authenicate, updateQuestion);
router.delete('/questions/:id', authenicate, deleteQuestion);

router.get('/questions', getQuestionList);
router.get('/questions/:id', getQuestionDetails);

export default router;
