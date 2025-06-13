import express from 'express';
import multer from 'multer';
import User from '../models/file.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToS3, deleteFileFromS3, getSignedUrlForS3 } from '../utils/s3Uploader.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:handle/profile-pic', upload.single('profilePic'), async (req, res) => {
  const { handle } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const user = await User.findOne({ handle });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.profilePic) {
      await deleteFileFromS3(user.profilePic);
    }

    const ext = file.originalname.split('.').pop();
    const key = `profile-pics/${uuidv4()}.${ext}`;
    await uploadFileToS3(file.buffer, key, file.mimetype);

    user.profilePic = key;
    await user.save();

    const signedUrl = await getSignedUrlForS3(key);
    res.status(200).json({ profilePic: signedUrl });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:handle/stats', async (req, res) => {
  const { handle } = req.params;

  try {
    const user = await User.findOne({ handle });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const questionsDone = Array.isArray(user.solvedQuestions) ? user.solvedQuestions.length : 0;
    const profilePicUrl = user.profilePic ? await getSignedUrlForS3(user.profilePic) : null;

    res.status(200).json({ questionsDone, profilePic: profilePicUrl });
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
