function length(value) {
  if (typeof value === "string" && value.indexOf("\n") > -1) {
    return value
      .split("\n")
      .map(line => line.length)
      .reduce((prev, current) => (current > prev ? current : prev), 0);
  }
  return value === undefined ? "" : `${value}`.length;
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

module.exports = { length, size };
