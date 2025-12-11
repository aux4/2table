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

  const fieldOrder = [];
  const nestedFieldSets = {};

  // Use the first item to establish field order
  const firstItem = dataToAnalyze[0];
  if (typeof firstItem === 'object' && firstItem !== null) {
    const allKeys = Object.keys(firstItem);
    const fields = allKeys.filter(key =>
      !(key.startsWith('__') && key.endsWith('__'))
    );
    fieldOrder.push(...fields);
  }

  // Analyze all items to get complete nested field coverage
  for (const item of dataToAnalyze) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      // Add any new fields not seen in first item, but filter out internal fields
      if (!fieldOrder.includes(key) && !(key.startsWith('__') && key.endsWith('__'))) {
        fieldOrder.push(key);
      }

      if (Array.isArray(value)) {
        // Analyze all objects in the array to get complete nested field coverage
        if (!nestedFieldSets[key]) {
          nestedFieldSets[key] = [];
        }
        for (const arrayItem of value) {
          if (typeof arrayItem === 'object' && arrayItem !== null) {
            Object.keys(arrayItem).forEach(nestedKey => {
              if (!nestedFieldSets[key].includes(nestedKey)) {
                nestedFieldSets[key].push(nestedKey);
              }
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // For single nested objects, add all keys
        if (!nestedFieldSets[key]) {
          nestedFieldSets[key] = [];
        }
        Object.keys(value).forEach(nestedKey => {
          if (!nestedFieldSets[key].includes(nestedKey)) {
            nestedFieldSets[key].push(nestedKey);
          }
        });
      }
    }
  }

  const fields = [];
  
  for (const key of fieldOrder) {
    if (nestedFieldSets[key] && nestedFieldSets[key].length > 0) {
      const nestedFields = nestedFieldSets[key].join(',');
      fields.push(`${key}[${nestedFields}]`);
    } else {
      fields.push(key);
    }
  }

  return fields.join(',');
}

export { generateStructureFromJson };