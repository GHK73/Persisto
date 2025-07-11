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

import { protectedRoute } from '../controller/protectedRoute.js'; 
import { authenicate } from '../middleware/authenicate.js';

const router = express.Router();

console.log('✅ router.js loaded');


router.post('/signup/request-otp', signupRequestOtp);
router.post('/signup/verify-otp', signupVerifyOtp);
router.post('/signup/complete', signupComplete);

router.post('/signin', signin);

router.post('/forgot-password/request-otp', forgotPasswordRequestOtp);
router.post('/forgot-password/verify-otp', forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', resetPassword);


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
