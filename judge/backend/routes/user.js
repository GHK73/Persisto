import express from 'express';
import multer from 'multer';
import User from '../models/file.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const uploadDir = 'uploads/profile-pics';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage });

// ✅ Route must match: /users/:userId/profile-pic
router.post('/:userId/profile-pic', upload.single('profilePic'), async (req, res) => {
  const { userId } = req.params;

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const user = await User.findOne({ uniqueId: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old pic
    if (user.profilePic) {
      const oldPath = path.join(process.cwd(), user.profilePic.replace(/^\//, ''));
      try {
        await fs.promises.access(oldPath, fs.constants.F_OK);
        await fs.promises.unlink(oldPath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          await User.updateOne({ uniqueId: userId }, { $unset: { profilePic: 1 } });
        }
      }
    }

    user.profilePic = `/uploads/profile-pics/${req.file.filename}`;
    await user.save();

    res.json({ profilePic: user.profilePic });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
