import { exec, spawn } from 'child_process';
import path from 'path';

/**
 * Compiles and runs a Java source file with provided input.
 * @param {string} filePath - Absolute path to the Java source file.
 * @param {string} input - Input string to pass to the program.
 * @returns {Promise<string>} - Resolves with the program's output or rejects with error.
 */
export const executeJava = (filePath, input = '') => {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath, '.java'); // Java class name assumed to match filename

  return new Promise((resolve, reject) => {
    // Compile the Java source file
    exec(`javac "${fileName}.java"`, { cwd: dir }, (compileErr, _, compileStderr) => {
      if (compileErr) {
        console.error('❌ Compilation Error:', compileStderr);
        return reject(new Error(`Compilation Error: ${compileStderr.trim()}`));
      }

      console.log(`✅ Compilation successful for ${fileName}.java`);

      // Spawn the Java program
      const runProcess = spawn('java', [fileName], { cwd: dir });

      let output = '';
      let errorOutput = '';

      // Handle stdout
      runProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Handle stderr
      runProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Write input if provided
      if (input) {
        console.log(`➡️ Sending input:\n${input}`);
        runProcess.stdin.write(input);
      }
      runProcess.stdin.end();

      // Handle process exit
      runProcess.on('close', (code) => {
        console.log(`🔄 Java process exited with code: ${code}`);

        if (code !== 0 || errorOutput.trim()) {
          console.error('⚠️ Runtime Error:', errorOutput.trim());
          return reject(new Error(`Runtime Error: ${errorOutput.trim() || `Exited with code ${code}`}`));
        }

        resolve(output);
      });
    });
  });
};
