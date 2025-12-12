/**
 * Auto-structure generation - simplified version
 */
export function generateStructureFromJson(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Analyze all objects to find all possible fields with complexity scoring
  const allFields = new Map();

  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      for (const key in item) {
        const value = item[key];

        if (!allFields.has(key)) {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            // Array of objects - high complexity, preferred
            const subFields = Object.keys(value[0]);
            allFields.set(key, {
              structure: `${key}[${subFields.join(',')}]`,
              complexity: 3
            });
          } else if (typeof value === 'object' && value !== null) {
            // Object - medium complexity
            const subFields = Object.keys(value);
            allFields.set(key, {
              structure: `${key}[${subFields.join(',')}]`,
              complexity: 2
            });
          } else {
            // Simple field - low complexity
            allFields.set(key, {
              structure: key,
              complexity: 1
            });
          }
        }
      }
    }
  });

  // For nested objects, prioritize complex sub-fields
  const processedFields = new Map();

  for (const [fieldName, fieldData] of allFields) {
    if (fieldData.complexity === 2 || fieldData.complexity === 3) {
      // This is an object or array of objects - analyze its sub-fields across all items
      const subFieldComplexities = new Map();

      data.forEach(item => {
        if (typeof item === 'object' && item !== null && item[fieldName]) {
          const nestedValue = item[fieldName];
          if (typeof nestedValue === 'object' && nestedValue !== null) {
            for (const subKey in nestedValue) {
              const subValue = nestedValue[subKey];
              let subComplexity = 1;

              if (Array.isArray(subValue) && subValue.length > 0 && typeof subValue[0] === 'object') {
                subComplexity = 3;
              } else if (typeof subValue === 'object' && subValue !== null) {
                subComplexity = 2;
              }

              if (!subFieldComplexities.has(subKey) || subFieldComplexities.get(subKey) < subComplexity) {
                subFieldComplexities.set(subKey, subComplexity);
              }
            }
          }
        }
      });

      // Build structure based on most complex sub-fields
      if (subFieldComplexities.size > 0) {
        const prioritizedSubFields = Array.from(subFieldComplexities.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by complexity descending
          .map(([subKey, complexity]) => {
            if (complexity === 3) {
              // Find array structure
              for (const item of data) {
                if (item[fieldName] && Array.isArray(item[fieldName][subKey]) &&
                    item[fieldName][subKey].length > 0 &&
                    typeof item[fieldName][subKey][0] === 'object') {
                  const arraySubFields = Object.keys(item[fieldName][subKey][0]);
                  return `${subKey}[${arraySubFields.join(',')}]`;
                }
              }
              return subKey;
            } else if (complexity === 2) {
              // Find object structure
              for (const item of data) {
                if (item[fieldName] && item[fieldName][subKey] &&
                    typeof item[fieldName][subKey] === 'object' &&
                    item[fieldName][subKey] !== null) {
                  const objSubFields = Object.keys(item[fieldName][subKey]);
                  return `${subKey}[${objSubFields.join(',')}]`;
                }
              }
              return subKey;
            }
            return subKey;
          });

        processedFields.set(fieldName, `${fieldName}[${prioritizedSubFields.join(',')}]`);
      } else {
        processedFields.set(fieldName, fieldData.structure);
      }
    } else {
      processedFields.set(fieldName, fieldData.structure);
    }
  }

  return Array.from(processedFields.values()).join(',');
}