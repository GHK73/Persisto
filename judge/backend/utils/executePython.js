import { spawn } from 'child_process';
import path from 'path';

/**
 * Returns a reusable runner function for executing a Python script with dynamic input.
 * Python is an interpreted language, so compilation isn't needed.
 *
 * @param {string} filePath - Absolute path to the Python file.
 * @returns {Promise<{ run: (input: string) => Promise<string> }>}
 */
export const executePython = async (filePath) => {
  const run = (input = '') => {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', [filePath]);

      let output = '';
      let errorOutput = '';

      // Write input
      if (input) {
        process.stdin.write(input);
      }
      process.stdin.end();

      // Collect output
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0 || errorOutput.trim()) {
          return reject(new Error(`Runtime Error: ${errorOutput.trim() || `Exited with code ${code}`}`));
        }
        resolve(output);
      });
    });
  };

  return { run };
};
