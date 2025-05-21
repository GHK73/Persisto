import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dircode = path.join(__dirname,"codes");

if(!fs.existsSync(dircode)){
    fs.mkdirSync(dircode,{recursive: true});
}
const generateFile = (language, code)=>{
    const jobId = uuidv4();
    const filename = `${jobId}.${language}`;
    const filePath = path.join(dircode,filename);
    fs.writeFileSync(filePath,code);
    return filePath;
};

module.exports = {
    generateFile
}