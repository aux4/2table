function length(value) {
  if (value === undefined || typeof value === "object" || Array.isArray(value)) {
    return 0;
  }

  if (typeof value === "string" && value.indexOf("\n") > -1) {
    return value
      .split("\n")
      .map(removeNonAnsiCharacters)
      .map(line => line.length)
      .reduce((prev, current) => (current > prev ? current : prev), 0);
  }

  return removeNonAnsiCharacters(`${value}`).length;
}

function size(value) {
  if (value === undefined || value === null) {
    return 0;
  } else if (Array.isArray(value)) {
    return value.length;
  } else {
    return (`${value}`.match(/\n/g) || []).length + 1;
  }
}

function removeNonAnsiCharacters(text) {
  return text.replace(/(\x9B|\x1B\[)[0-?m]*/g, "");
}

module.exports = { length, size };
