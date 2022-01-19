const COMMA_REGEX = /([\w:\s]+(\([^(]+\))?(\[[^[]+])?({([^{]+)})?)/g;
const NAME_EXTRACTOR = /([^:([{]+(:[^[({]+)?)/;
const FIELD_EXTRACTOR_REGEX = /(\(([^(]+)\))/g;
const GROUP_EXTRACTOR_REGEX = /(\[([^[]+)])/g;
const PROPERTIES_EXTRACTOR_REGEX = /({([^{]+)})/;

function parseStructure(structure) {
  return structure.match(COMMA_REGEX).map(item => {
    const fieldExtractorInfo = FIELD_EXTRACTOR_REGEX.exec(item);
    const fieldExtractor = fieldExtractorInfo ? fieldExtractorInfo[2] : undefined;

    const groupExtractorInfo = GROUP_EXTRACTOR_REGEX.exec(item);
    const groupExtractor = groupExtractorInfo ? groupExtractorInfo[2] : undefined;

    const propertiesExtractorInfo = PROPERTIES_EXTRACTOR_REGEX.exec(item);
    const propertiesExtractor = propertiesExtractorInfo ? propertiesExtractorInfo[2] : undefined;

    const properties = readProperties(propertiesExtractor);

    let column = NAME_EXTRACTOR.exec(item)[0];

    const structureItem = {};
    const splitItem = column.split(":");
    if (splitItem.length === 1) {
      structureItem.field = splitItem[0];
      structureItem.label = splitItem[0];
    } else {
      structureItem.field = splitItem[0];
      structureItem.label = splitItem[1];
    }
    structureItem.key = `${structureItem.field}:${structureItem.label}`;
    structureItem.properties = properties;
    structureItem.extractor = fieldExtractor ? value => extractField(fieldExtractor, value) : value => value;
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
      .split(",")
      .map(property => property.split(":"))
      .map(property => ({ key: property[0], value: property[1] }))
      .forEach(property => {
        properties[property.key] = property.value;
      });
  }

  return properties;
}

function extractField(fieldName, value) {
  if (Array.isArray(value)) {
    return value.map(item => item[fieldName]);
  }
  return value[fieldName];
}

module.exports = { parseStructure };
