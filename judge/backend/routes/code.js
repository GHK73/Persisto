import express from 'express';
import { runCode, submitCode, getUniqueQuestionsSolved } from '../controller/codeController.js';
import { authenicate } from '../middleware/authenicate.js'; // Corrected spelling

const router = express.Router();

// Route to run code
router.post('/run', authenicate, runCode);

// Route to submit code for evaluation
router.post('/submit', authenicate, submitCode);

// Route to get the count of unique questions solved by the user
router.get('/unique-solved', authenicate, getUniqueQuestionsSolved);

export default router;
