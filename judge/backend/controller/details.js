import User from '../models/file.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.SECRET_KEY;

export const signup = async (req, res) => {

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

    res.status(201).json({
      message: 'User registered successfully!',      
    });
  } catch (error) {
  console.error('Error during signup:', error); // log the whole error object, not just message
  res.status(500).json({ message: 'Server error' });
}
};

export const signin = async (req, res) => {
  try {
    const { login, password } = req.body;  // login can be email or handle

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
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
    });
  } catch (error) {
    console.error('Error during signin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
