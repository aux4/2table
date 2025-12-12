function generateStructureFromJson(jsonData) {
  if (!jsonData) {
    return "";
  }

  let dataToAnalyze;
  if (Array.isArray(jsonData)) {
    if (jsonData.length === 0) {
      return "";
    }
    dataToAnalyze = jsonData;
  } else {
    dataToAnalyze = [jsonData];
  }

  const structure = analyzeStructure(dataToAnalyze, 3); // Support up to 3 levels
  return buildStructureString(structure);
}

function analyzeStructure(dataArray, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null; // Stop recursing at max depth
  }

  const fieldOrder = [];
  const nestedStructures = {};

  // Use the first item to establish field order
  const firstItem = dataArray[0];
  if (typeof firstItem === 'object' && firstItem !== null) {
    const allKeys = Object.keys(firstItem);
    const fields = allKeys.filter(key =>
      !(key.startsWith('__') && key.endsWith('__'))
    );
    fieldOrder.push(...fields);
  }

  // Analyze all items to get complete nested field coverage
  for (const item of dataArray) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      // Add any new fields not seen in first item, but filter out internal fields
      if (!fieldOrder.includes(key) && !(key.startsWith('__') && key.endsWith('__'))) {
        fieldOrder.push(key);
      }

      if (Array.isArray(value)) {
        // Analyze all objects in the array recursively
        const objectsInArray = value.filter(item => typeof item === 'object' && item !== null);
        if (objectsInArray.length > 0) {
          const nestedStructure = analyzeStructure(objectsInArray, maxDepth, currentDepth + 1);
          if (nestedStructure) {
            nestedStructures[key] = nestedStructure;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // For single nested objects, analyze recursively
        const nestedStructure = analyzeStructure([value], maxDepth, currentDepth + 1);
        if (nestedStructure) {
          nestedStructures[key] = nestedStructure;
        }
      }
    }
  }

  return { fieldOrder, nestedStructures };
}

function buildStructureString(structure) {
  if (!structure || !structure.fieldOrder) {
    return "";
  }

  const fields = [];

  for (const key of structure.fieldOrder) {
    if (structure.nestedStructures[key]) {
      const nestedString = buildStructureString(structure.nestedStructures[key]);
      if (nestedString) {
        fields.push(`${key}[${nestedString}]`);
      } else {
        fields.push(key);
      }
    } else {
      fields.push(key);
    }
  }

  return fields.join(',');
}

export { generateStructureFromJson };