function readStdIn() {
  return new Promise(resolve => {
    let inputString = "";

    stdin = process.openStdin();

    stdin.on("data", function (data) {
      inputString += data;
    });

    stdin.on("end", function () {
      resolve(inputString);
    });
  });
}

module.exports = { readStdIn };
