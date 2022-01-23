const colors = require("colors");
const COMMA_REGEX = /([\w:\s]+(\([^(]+\))?(\[[^[]+])?({([^{]+)})?)/g;
const PARSER_REGEX =
  /^(?<field>[^:([{]+)(:(?<label>([^([{]+)))?(\((?<nestedField>[^\)]+)\))?(\[(?<group>[^\]]+)\])?(\{(?<properties>[^\}]+)\})?/;

function parseStructure(structure) {
  return structure.match(COMMA_REGEX).map(item => {
    const parsedItem = PARSER_REGEX.exec(item);

    const field = parsedItem.groups.field;
    const label = parsedItem.groups.label;
    const fieldExtractor = parsedItem.groups.nestedField;
    const groupExtractor = parsedItem.groups.group;
    const propertiesExtractor = parsedItem.groups.properties;

    const properties = readProperties(propertiesExtractor);

    const structureItem = {};
    structureItem.field = field;
    structureItem.label = label || field;
    structureItem.key = `${structureItem.field}:${structureItem.label}`;
    structureItem.properties = properties;
    structureItem.extractor = fieldExtractor ? value => extractField(fieldExtractor, value) : value => value;
    structureItem.style = defaultStyle;
    if (groupExtractor) {
      structureItem.group = parseStructure(groupExtractor);
    }
    return structureItem;
  });
}

function readProperties(propertiesInfo) {
  const properties = {};

  if (propertiesInfo) {
    propertiesInfo
      .split(";")
      .map(property => property.split(":"))
      .map(property => ({ key: property[0], value: property[1] }))
      .forEach(property => {
        properties[property.key] = extractPropertyValue(property.value);
      });
  }

  return properties;
}

function extractPropertyValue(value) {
  if (value.indexOf(",") > -1) {
    return value.split(",");
  }
  return value;
}

function extractField(fieldName, value) {
  if (Array.isArray(value)) {
    return value.map(item => item[fieldName]);
  }
  return value[fieldName];
}

function defaultStyle(properties) {
  return text => {
    let styledText = text;
    if (properties.color) {
      const color = Array.isArray(properties.color) ? properties.color : [properties.color];
      color.forEach(colorStyle => {
        try {
          styledText = colors[colorStyle](styledText);
        } catch (e) {}
      });
    }
    return styledText;
  };
}

module.exports = { parseStructure };
