import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dirCode = path.join(__dirname, 'codes');

if (!fs.existsSync(dirCode)) {
  fs.mkdirSync(dirCode, { recursive: true });
}

export const generateFile = (language, code) => {
  const jobId = uuidv4();
  const filename = `${jobId}.${language}`;
  const filePath = path.join(dirCode, filename);
  fs.writeFileSync(filePath, code);
  return filePath;
};