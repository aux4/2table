import colors from "colors";

function parseStructure(structure) {
  return parseItems(structure);
}

function parseItems(str) {
  const items = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth--;
    else if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
    
    if (char === ',' && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
      items.push(parseItem(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    items.push(parseItem(current.trim()));
  }
  
  return items;
}

function parseItem(item) {
  const PARSER_REGEX =
    /^(?<field>[^:([{]+)(:(?<label>([^([{]+)))?(\((?<nestedField>[^\)]+)\))?(\[(?<group>.+)\])?(\{(?<properties>[^\}]+)\})?/;
    
  const parsedItem = PARSER_REGEX.exec(item);
  
  if (!parsedItem) {
    throw new Error(`Invalid structure item: ${item}`);
  }

  const field = parsedItem.groups.field;
  const label = parsedItem.groups.label;
  const fieldExtractor = parsedItem.groups.nestedField;
  const groupExtractor = parsedItem.groups.group;
  const propertiesExtractor = parsedItem.groups.properties;

  const properties = readProperties(propertiesExtractor);

  const structureItem = {};
  structureItem.field = field;
  structureItem.label = (label || field).replace(/^["']|["']$/g, '');
  structureItem.key = `${structureItem.field}:${structureItem.label}`;
  structureItem.properties = properties;
  
  // Handle dot notation in field names
  if (field.includes('.')) {
    structureItem.extractor = value => getNestedProperty(value, field);
  } else {
    structureItem.extractor = fieldExtractor ? value => extractField(fieldExtractor, value) : value => value;
  }
  
  structureItem.style = defaultStyle;
  if (groupExtractor) {
    structureItem.group = parseItems(groupExtractor);
  }
  return structureItem;
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
    return value.map(item => getNestedProperty(item, fieldName));
  }
  return getNestedProperty(value, fieldName);
}

function getNestedProperty(obj, path) {
  if (!path || !obj) return obj;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    result = result[key];
  }
  
  return result;
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

export { parseStructure };
