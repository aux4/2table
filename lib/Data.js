const { length } = require("./Utils");

function prepareData(data, structure, config) {
  if (Array.isArray(data)) {
    return data.map(item => transform(item, structure, config));
  }
  return transform(data, structure, config);
}

function transform(data, structure, config) {
  if (data === undefined || data === null) return data;

  const item = {};
  structure.forEach(structureItem => {
    const value = data[structureItem.field];

    if (structureItem.group) {
      if (Array.isArray(value)) {
        item[structureItem.key] = value.map(valueItem => transform(valueItem, structureItem.group));
      } else {
        item[structureItem.key] = transform(value, structureItem.group);
      }
    } else {
      item[structureItem.key] = structureItem.extractor(value);
    }

    if (structureItem.properties.width) {
      if (typeof item[structureItem.key] === "string") {
        item[structureItem.key] = limitWidth(
          item[structureItem.key],
          structureItem.properties.width,
          structureItem.properties.truncate
        );
      } else if (Array.isArray(item[structureItem.key]) && typeof item[structureItem.key][0] === "string") {
        item[structureItem.key] = item[structureItem.key].map(item =>
          limitWidth(item, structureItem.properties.width, structureItem.properties.truncate)
        );
      }
    }

    if (config) {
      config[structureItem.key].width.add(length(item[structureItem.key], config[structureItem.key].group));
    }
  });
  return item;
}

function limitWidth(text, width, truncate) {
  if (text.length <= width) {
    return text;
  }

  if (truncate === "true") {
    return text.substring(0, width - 3) + "...";
  }

  return breakWords(text, width).replace(/\n\s/g, "\n").replace(/\n$/, "");
}

function breakWords(text, width) {
  let whitespacePosition = 0;
  let lastBreak = 0;
  let breakWordText = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i].match(/\W/)) {
      whitespacePosition = i;
    }

    if (i > 0 && (i - lastBreak) % width === 0) {
      const lastPosition = whitespacePosition > lastBreak ? whitespacePosition : i;
      breakWordText += text.substring(lastBreak, lastPosition).trim() + "\n";
      lastBreak = lastPosition;
      i = lastPosition + 1;
    }
  }

  breakWordText += text.substring(lastBreak, text.length).trim();

  return breakWordText;
}

module.exports = { prepareData };
