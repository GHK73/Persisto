import { exec, execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const executeJava = async (filePath, input) => {
  // filePath points to the .java file, e.g. /tmp/Code123.java
  // We compile it first, then run the class.

  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath, '.java'); // Class name

  return new Promise((resolve, reject) => {
    exec(`javac ${fileName}.java`, { cwd: dir }, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) return reject(new Error(compileStderr || compileErr.message));

      const runProcess = exec(`java ${fileName}`, { cwd: dir }, (runErr, stdout, stderr) => {
        if (runErr) return reject(new Error(stderr || runErr.message));
        resolve(stdout);
      });

      if (input) {
        runProcess.stdin.write(input);
        runProcess.stdin.end();
      }
    });
  });
};
