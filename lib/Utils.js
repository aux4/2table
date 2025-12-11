function length(value, config) {
  if (value === undefined) {
    return 0;
  }

  if (Array.isArray(value)) {
    if (config) {
      return value
        .map(item => nestedLength(item, config))
        .reduce((prev, current) => (current > prev ? current : prev), 0);
    }

    return value
      .map(removeNonAnsiCharacters)
      .map(line => line.length)
      .reduce((prev, current) => (current > prev ? current : prev), 0);
  } else if (config) {
    return nestedLength(value, config);
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

function nestedLength(value, config) {
  let width = 0;
  Object.keys(config).forEach(key => {
    config[key].width.add(length(value[key], config[key].group));
    width += config[key].width.value() + 2;
  });
  return width > 0 ? width - 2 : width;
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
  // Ensure text is a string
  if (typeof text !== 'string') {
    text = String(text);
  }
  return text.replace(/(\x9B|\x1B\[)[0-?m]*/g, "");
}

export { length, size };
