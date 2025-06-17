import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(path.resolve(), 'outputs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Compiles C++ code once and returns a runner function for repeated input.
 */
export const executeCpp = (filePath, _input = '', onlyBuild = false) => {
  const jobId = path.basename(filePath).split('.')[0];
  const executablePath = path.join(outputDir, jobId);

  return new Promise((resolve, reject) => {
    exec(`g++ "${filePath}" -o "${executablePath}"`, (compileErr, _, compileStderr) => {
      if (compileErr) {
        return reject(new Error(`Compilation Error: ${compileStderr.trim()}`));
      }

      if (onlyBuild) {
        // Return a reusable runner
        const run = (input) => {
          return new Promise((res, rej) => {
            const child = spawn(executablePath);

            let output = '';
            let errorOutput = '';

            child.stdin.write(input);
            child.stdin.end();

            child.stdout.on('data', (data) => (output += data.toString()));
            child.stderr.on('data', (data) => (errorOutput += data.toString()));

            child.on('close', (code) => {
              if (code !== 0 || errorOutput.trim()) {
                return rej(new Error(`Runtime Error: ${errorOutput.trim() || `Exited with code ${code}`}`));
              }
              res(output);
            });
          });
        };

        resolve({ run });
      } else {
        // Run immediately
        const child = spawn(executablePath);
        let output = '';
        let errorOutput = '';

        child.stdin.write(_input);
        child.stdin.end();

        child.stdout.on('data', (data) => (output += data.toString()));
        child.stderr.on('data', (data) => (errorOutput += data.toString()));

        child.on('close', (code) => {
          try {
            fs.unlinkSync(executablePath);
          } catch (_) {}

          if (code !== 0 || errorOutput.trim()) {
            return reject(new Error(`Runtime Error: ${errorOutput.trim() || `Exited with code ${code}`}`));
          }
          resolve(output);
        });
      }
    });
  });
};
