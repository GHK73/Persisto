// --- middleware/uploadMiddleware.js ---

import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure the uploads directory exists
const uploadDir = path.join('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Temporary local folder before upload to S3
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage });

const multiFileUpload = upload.fields([
  { name: 'description', maxCount: 1 },
  { name: 'inputFiles', maxCount: 20 },
  { name: 'outputFiles', maxCount: 20 },
  { name: 'sampleInput', maxCount: 5 },
  { name: 'sampleOutput', maxCount: 5 },
]);

export default multiFileUpload;
