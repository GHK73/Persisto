import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const outputPath = path.join(path.resolve(), 'outputs');
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

export const executeCpp = (filePath, input = '') => {
  const jobId = path.basename(filePath).split('.')[0];
  const outputFilename = `${jobId}.out`;
  const outputFilePath = path.join(outputPath, outputFilename);

  return new Promise((resolve, reject) => {
    exec(`g++ ${filePath} -o ${outputFilePath}`, (compileErr, _, compileStderr) => {
      if (compileErr) return reject(new Error(`Compilation Error: ${compileStderr}`));

      const child = spawn(outputFilePath);
      let output = '';
      let errorOutput = '';

      child.stdin.write(input);
      child.stdin.end();

      child.stdout.on('data', (data) => output += data.toString());
      child.stderr.on('data', (data) => errorOutput += data.toString());

      child.on('close', (code) => {
        if (code !== 0 || errorOutput) return reject(new Error(`Runtime Error: ${errorOutput}`));
        resolve(output);
      });
    });
  });
};
