import { exec, spawn } from 'child_process';
import path from 'path';

export const executeJava = (filePath, _input = '', onlyBuild = false) => {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath, '.java');

  return new Promise((resolve, reject) => {
    exec(`javac "${fileName}.java"`, { cwd: dir }, (compileErr, _, compileStderr) => {
      if (compileErr) {
        return reject(new Error(`Compilation Error: ${compileStderr.trim()}`));
      }

      if (onlyBuild) {
        const run = (input) => {
          return new Promise((res, rej) => {
            const proc = spawn('java', [fileName], { cwd: dir });

            let output = '';
            let err = '';

            proc.stdin.write(input);
            proc.stdin.end();

            proc.stdout.on('data', (data) => (output += data.toString()));
            proc.stderr.on('data', (data) => (err += data.toString()));

            proc.on('close', (code) => {
              if (code !== 0 || err.trim()) {
                return rej(new Error(`Runtime Error: ${err.trim() || `Exited with code ${code}`}`));
              }
              res(output);
            });
          });
        };

        resolve({ run });
      } else {
        const proc = spawn('java', [fileName], { cwd: dir });

        let output = '';
        let err = '';

        proc.stdin.write(_input);
        proc.stdin.end();

        proc.stdout.on('data', (data) => (output += data.toString()));
        proc.stderr.on('data', (data) => (err += data.toString()));

        proc.on('close', (code) => {
          if (code !== 0 || err.trim()) {
            return reject(new Error(`Runtime Error: ${err.trim() || `Exited with code ${code}`}`));
          }
          resolve(output);
        });
      }
    });
  });
};
