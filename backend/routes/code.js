import express from 'express';
import { runCode, submitCode, getUniqueQuestionsSolved, reviewCode } from '../controller/codeController.js';
import { authenicate } from '../middleware/authenicate.js';
import { codeExecutionRateLimit } from '../middleware/codeExecutionRateLimit.js';

const router = express.Router();

router.post('/run', authenicate, codeExecutionRateLimit, runCode);

router.post('/submit', authenicate, codeExecutionRateLimit, submitCode);

router.get('/unique-solved', authenicate, getUniqueQuestionsSolved);
router.post('/review', authenicate, reviewCode);

export default router;
