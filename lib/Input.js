const fs = require("fs");

const BUFFER_SIZE = 256;

const buf = Buffer.alloc(BUFFER_SIZE);
let bytesRead;
let stdin = "";

function readStdIn() {
  do {
    bytesRead = 0;

    try {
      bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFFER_SIZE, null);
    } catch (e) {
      if (e.code === "EAGAIN") {
        throw "ERROR: interactive stdin input not supported.";
      } else if (e.code === "EOF") {
        break;
      }
      throw e;
    }
    if (bytesRead === 0) {
      break;
    }
    stdin += buf.toString(undefined, 0, bytesRead);
  } while (bytesRead > 0);

  return stdin;
}

module.exports = { readStdIn };
