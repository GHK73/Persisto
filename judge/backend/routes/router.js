// routes/router.js

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

import { protectedRoute } from '../controller/protectedRoute.js'; // optional if you later separate logic
import { authenicate } from '../middleware/authenicate.js';

const router = express.Router();

// ✅ Log to confirm the router is loaded
console.log('✅ router.js loaded');

// ======== AUTH ROUTES ========

// Signup routes
router.post('/signup/request-otp', signupRequestOtp);
router.post('/signup/verify-otp', signupVerifyOtp);
router.post('/signup/complete', signupComplete);

// Signin route
router.post('/signin', signin);

// Forgot password routes
router.post('/forgot-password/request-otp', forgotPasswordRequestOtp);
router.post('/forgot-password/verify-otp', forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', resetPassword);

// ======== PROTECTED ROUTE ========
router.get('/check-auth', authenicate, (req, res) => {
  const { email, handle, isAdmin } = req.user;

  return res.status(200).json({
    user: {
      email,
      handle,
      isAdmin,
    },
  });
});

export default router;
