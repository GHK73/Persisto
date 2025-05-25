import multer from 'multer';
import fs from 'fs';

// Temporary storage for files before moving them to question folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = './temp/';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// multer middleware expects these fields (same as frontend):
const upload = multer({ storage }).fields([
  { name: 'description', maxCount: 1 },
  { name: 'inputFiles', maxCount: 20 },
  { name: 'outputFiles', maxCount: 20 }
]);

export default upload;
