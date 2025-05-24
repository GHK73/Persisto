import express from 'express';
import {
  signupRequestOtp,
  signupVerifyOtp,
  signupComplete,
  signin,
  forgotPasswordRequestOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
} from '../controller/details.js';
import { protectedRoute } from '../controller/protectedRoute.js';  // middleware for protected routes

import { authenicate } from '../middleware/authenicate.js'; 

const router = express.Router();

router.post('/signup/request-otp', signupRequestOtp);
router.post('/signup/verify-otp', signupVerifyOtp);
router.post('/signup/complete', signupComplete);
router.post('/signin', signin);

// Forgot password routes
router.post('/forgot-password/request-otp', forgotPasswordRequestOtp);
router.post('/forgot-password/verify-otp', forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', resetPassword);

// ✅ Protected route
router.get('/protected', authenicate, protectedRoute);

export default router;
