import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define the directory to store compiled executables
const outputDir = path.join(path.resolve(), 'outputs');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Compiles and runs a C++ source file with provided input.
 * @param {string} filePath - Absolute path to the C++ source file.
 * @param {string} input - Input string to pass to the program.
 * @returns {Promise<string>} - Resolves with the program's output or rejects with error.
 */
export const executeCpp = (filePath, input = '') => {
  // Extract a unique job ID from the filename (UUID assumed)
  const jobId = path.basename(filePath).split('.')[0];

  // Define the path for the compiled executable
  const executablePath = path.join(outputDir, jobId);

  return new Promise((resolve, reject) => {
    // Compile the C++ code using g++
    exec(`g++ "${filePath}" -o "${executablePath}"`, (compileErr, stdout, compileStderr) => {
      if (compileErr) {
        console.error('❌ Compilation Error:', compileStderr);
        return reject(new Error(`Compilation Error: ${compileStderr.trim()}`));
      }

      console.log(`✅ Compilation successful: ${filePath}`);

      // Spawn the compiled executable as a child process
      const child = spawn(executablePath);

      let programOutput = '';
      let programError = '';

      // Write input to the child process's stdin
      console.log(`➡️ Sending input:\n${input}`);
      child.stdin.write(input);
      child.stdin.end();

      // Collect stdout data
      child.stdout.on('data', (data) => {
        programOutput += data.toString();
      });

      // Collect stderr data
      child.stderr.on('data', (data) => {
        programError += data.toString();
      });

      // Handle process exit
      child.on('close', (code) => {
        // Clean up the executable file
        try {
          fs.unlinkSync(executablePath);
        } catch (err) {
          console.warn(`⚠️ Failed to delete executable: ${executablePath}`, err.message);
        }

        console.log(`🔄 Process exited with code: ${code}`);
        console.log(`📤 Output:\n${programOutput.trim()}`);

        if (programError.trim()) {
          console.log(`⚠️ Error Output:\n${programError.trim()}`);
        }

        if (code !== 0 || programError.trim()) {
          return reject(new Error(`Runtime Error: ${programError.trim() || `Exited with code ${code}`}`));
        }

        // Resolve with the captured program output
        resolve(programOutput);
      });
    });
  });
};
