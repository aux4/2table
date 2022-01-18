const COMMA_REGEX = /([\w:\s]+(\([^(]+\))?(\[[^[]+])?)/g;
const FIELD_EXTRACTOR_REGEX = /(\(([^(]+)\))/g;
const GROUP_EXTRACTOR_REGEX = /(\[([^[]+)])/g;

function parseStructure(structure) {
  return structure.match(COMMA_REGEX).map(item => {
    const fieldExtractorInfo = FIELD_EXTRACTOR_REGEX.exec(item);
    const fieldExtractor = fieldExtractorInfo ? fieldExtractorInfo[2] : undefined;

    const groupExtractorInfo = GROUP_EXTRACTOR_REGEX.exec(item);
    const groupExtractor = groupExtractorInfo ? groupExtractorInfo[2] : undefined;

    let column = item;
    if (fieldExtractorInfo) {
      column = column.replace(fieldExtractorInfo[0], "");
    }
    if (groupExtractorInfo) {
      column = column.replace(groupExtractorInfo[0], "");
    }

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
    structureItem.extractor = fieldExtractor ? value => extractField(fieldExtractor, value) : value => value;
    if (groupExtractor) {
      structureItem.group = parseStructure(groupExtractor);
    }
    return structureItem;
  });
}

function extractField(fieldName, value) {
  if (Array.isArray(value)) {
    return value.map(item => item[fieldName]);
  }
  return value[fieldName];
}

module.exports = { parseStructure };
