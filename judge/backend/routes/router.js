import express from 'express';
import {
  signupRequestOtp,
  signupVerifyOtp,
  signupComplete,
  signin,
} from '../controller/details.js';
import { authenicate } from '../middleware/authenicate.js';
import { protectedRoute } from '../controller/protectedRoute.js';

const router = express.Router();

router.post('/signup/request-otp', signupRequestOtp);
router.post('/signup/verify-otp', signupVerifyOtp);
router.post('/signup/complete', signupComplete);
router.post('/signin', signin);
router.post('/check-auth', authenicate, protectedRoute);

export default router;
