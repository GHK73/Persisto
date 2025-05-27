import express from 'express';
import { runCode, submitCode, getUniqueQuestionsSolved } from '../controller/codeController.js';
import { authenicate } from '../middleware/authenicate.js';

const router = express.Router();

router.post('/run', authenicate, runCode);
router.post('/submit', authenicate, submitCode);
router.get('/unique-solved', authenicate, getUniqueQuestionsSolved);

export default router;
