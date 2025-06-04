import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// codes directory at project root
const dirCode = path.join(__dirname, '..', 'codes');

if (!fs.existsSync(dirCode)) {
  fs.mkdirSync(dirCode, { recursive: true });
}

const extensionMap = {
  cpp: 'cpp',
  c: 'c',
  python: 'py',
  java: 'java',
};

export const generateFile = (language, code) => {
  const jobId = uuidv4();
  const ext = extensionMap[language.toLowerCase()] || language.toLowerCase();
  const filename = `${jobId}.${ext}`;
  const filePath = path.join(dirCode, filename);
  fs.writeFileSync(filePath, code);
  return filePath;
};
