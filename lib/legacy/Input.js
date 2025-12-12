function readStdIn() {
  return new Promise(resolve => {
    let inputString = "";

    const stdin = process.openStdin();

    stdin.on("data", function (data) {
      inputString += data;
    });

    stdin.on("end", function () {
      resolve(inputString);
    });
  });
}

export { readStdIn };
