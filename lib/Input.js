/**
 * Input utilities
 */
export function readStdIn() {
  return new Promise((resolve, reject) => {
    let input = '';

    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', () => {
      resolve(input);
    });

    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}