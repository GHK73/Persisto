import { execFile } from 'child_process';
import path from 'path';

export const executePython = (filePath, input) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = execFile('python3', [filePath], (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(stderr));
      resolve(stdout);
    });

    if (input) {
      pythonProcess.stdin.write(input);
      pythonProcess.stdin.end();
    }
  });
};
