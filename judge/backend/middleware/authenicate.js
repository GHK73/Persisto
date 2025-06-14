// --- middleware/authenicate.js ---
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/file.js'; // Assuming this is your User model

dotenv.config();
const JWT_SECRET = process.env.SECRET_KEY;

export const authenicate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ✅ Look up user by uniqueId from the token payload
    const user = await User.findOne({ uniqueId: decoded.id });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    // ✅ Attach actual MongoDB _id as userId
    req.user = {
      userId: user._id,          // ✅ Use this for queries like uploadedBy
      email: user.email,
      handle: user.handle,
      isAdmin: user.isAdmin,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
