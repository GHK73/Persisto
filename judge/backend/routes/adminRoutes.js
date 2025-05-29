// routes/adminRoutes.js
import express from 'express';
import { authenicate } from '../middleware/authenicate.js';
import { isAdmin } from '../middleware/isAdmin.js';
import User from '../models/file.js';

const router = express.Router();

router.get('/all-users', authenicate, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Grant admin rights to a user
router.put('/make-admin/:handle', authenicate, isAdmin, async (req, res) => {
  try {
    const { handle } = req.params;
    const user = await User.findOneAndUpdate(
      { handle },
      { isAdmin: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: `${handle} is now an admin` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

export default router;
