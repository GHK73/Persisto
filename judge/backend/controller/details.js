import User from '../models/file.js';
import Otp from '../models/otp.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendOtpEmail } from '../utils/mailer.js';

dotenv.config();
const JWT_SECRET = process.env.SECRET_KEY;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const signupRequestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndUpdate(
      { email, purpose: 'signup' },
      { otp, expiresAt, purpose: 'signup' },
      { upsert: true }
    );
    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending signup OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

export const signupVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await Otp.findOne({ email, otp, purpose: 'signup' });
    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Error verifying signup OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

export const signupComplete = async (req, res) => {
  try {
    const { name, handle, email, phone, password } = req.body;
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const handleExists = await User.findOne({ handle });
    if (handleExists) {
      return res.status(400).json({ message: 'Handle already in use' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
      name,
      handle,
      email,
      phone,
      password: hashedPassword,
    });
    await newUser.save();
    await Otp.deleteMany({ email, purpose: 'signup' });
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during signup completion:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const signin = async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ message: 'Please provide login and password' });
    }

    const user = await User.findOne({
      $or: [{ email: login }, { handle: login }],
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        isAdmin: user.isAdmin, // Include in token
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      handle: user.handle,
      email: user.email,
      isAdmin: user.isAdmin, // Return in response
    });
  } catch (error) {
    console.error('Error during signin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPasswordRequestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email, purpose: 'forgot_password' },
      { otp, expiresAt, purpose: 'forgot_password' },
      { upsert: true }
    );

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending forgot_password OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // Clean up used OTPs
    await Otp.deleteMany({ email, purpose: 'forgot-password' });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};
export const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpDoc = await Otp.findOne({ email, otp, purpose: 'forgot_password' });

    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Error verifying forgot-password OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

