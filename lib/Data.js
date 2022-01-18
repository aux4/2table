const { length } = require("./Utils");

function arrangeData(data, structure, config) {
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

    if (config) {
      config[structureItem.key].width.add(length(item[structureItem.key]));
    }
  });
  return item;
}

module.exports = { arrangeData };
