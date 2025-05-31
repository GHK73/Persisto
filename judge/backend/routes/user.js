// routes/user.js
import express from 'express';
import multer from 'multer';
import User from '../models/file.js'; // your model filename
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/profile-pics';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage });

/**
 * @route POST /users/:handle/profile-pic
 * @desc Upload or update profile picture by handle (username)
 */
router.post('/:handle/profile-pic', upload.single('profilePic'), async (req, res) => {
  const { handle } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const user = await User.findOne({ handle });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePic) {
      const oldPath = path.join(process.cwd(), user.profilePic.replace(/^\//, ''));
      try {
        await fs.promises.access(oldPath, fs.constants.F_OK);
        await fs.promises.unlink(oldPath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          await User.updateOne({ handle }, { $unset: { profilePic: 1 } });
        }
      }
    }

    // Save new profile picture path
    user.profilePic = `/uploads/profile-pics/${req.file.filename}`;
    await user.save();

    res.json({ profilePic: user.profilePic });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /users/:handle/stats
 * @desc Return questions solved stats by handle (username)
 */
router.get('/:handle/stats', async (req, res) => {
  const { handle } = req.params;

  try {
    const user = await User.findOne({ handle });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const questionsDone = Array.isArray(user.solvedQuestions) ? user.solvedQuestions.length : 0;

    res.json({ questionsDone });
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
