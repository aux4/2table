/**
 * Auto-structure generation with recursive deep analysis using strategy pattern
 */
export function generateStructureFromJson(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Create structure analysis strategy
  const structureAnalyzer = new DeepStructureAnalyzer();
  return structureAnalyzer.analyze(data);
}

/**
 * Strategy pattern for deep structure analysis
 */
class DeepStructureAnalyzer {
  analyze(data) {
    // Analyze all objects to find all possible fields with complexity scoring
    const allFields = new Map();

    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        for (const key in item) {
          const value = item[key];

          if (!allFields.has(key)) {
            const fieldAnalysis = this.analyzeField(value, data, key);
            allFields.set(key, fieldAnalysis);
          }
        }
      }
    });

    return Array.from(allFields.values()).map(field => field.structure).join(',');
  }

  analyzeField(value, data, key) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Array of objects - high complexity, preferred
      return this.analyzeArrayOfObjects(value, key);
    } else if (Array.isArray(value)) {
      // Array of primitives - simple array field
      return {
        structure: key,
        complexity: 1
      };
    } else if (typeof value === 'object' && value !== null) {
      // Object - medium complexity - analyze recursively
      return this.analyzeNestedObject(value, key);
    } else {
      // Simple field - low complexity
      return {
        structure: key,
        complexity: 1
      };
    }
  }

  analyzeArrayOfObjects(value, key) {
    // Collect all unique field names from all objects in the array
    const allSubFields = new Set();
    value.forEach(arrayItem => {
      if (typeof arrayItem === 'object' && arrayItem !== null) {
        Object.keys(arrayItem).forEach(subField => {
          allSubFields.add(subField);
        });
      }
    });

    // Recursively analyze each sub-field to build deep structure
    const structuredSubFields = [];
    allSubFields.forEach(subField => {
      const subStructure = this.analyzeSubFieldInArray(value, subField);
      structuredSubFields.push(subStructure);
    });

    return {
      structure: `${key}[${structuredSubFields.join(',')}]`,
      complexity: 3
    };
  }

  analyzeNestedObject(value, key) {
    // Recursively analyze nested object structure
    const nestedFields = [];
    for (const subKey in value) {
      const subValue = value[subKey];
      const subAnalysis = this.analyzeField(subValue, [value], subKey);
      nestedFields.push(subAnalysis.structure);
    }

    return {
      structure: `${key}[${nestedFields.join(',')}]`,
      complexity: 2
    };
  }

  analyzeSubFieldInArray(arrayValue, subField) {
    // Find the most complex representation of this sub-field across all array items
    let maxComplexity = 1;
    let bestStructure = subField;

    arrayValue.forEach(arrayItem => {
      if (typeof arrayItem === 'object' && arrayItem !== null && arrayItem[subField] !== undefined) {
        const subValue = arrayItem[subField];
        if (Array.isArray(subValue) && subValue.length > 0 && typeof subValue[0] === 'object') {
          // Nested array of objects
          const nestedAnalysis = this.analyzeArrayOfObjects(subValue, subField);
          if (nestedAnalysis.complexity > maxComplexity) {
            maxComplexity = nestedAnalysis.complexity;
            bestStructure = nestedAnalysis.structure;
          }
        } else if (typeof subValue === 'object' && subValue !== null) {
          // Nested object
          const nestedAnalysis = this.analyzeNestedObject(subValue, subField);
          if (nestedAnalysis.complexity > maxComplexity) {
            maxComplexity = nestedAnalysis.complexity;
            bestStructure = nestedAnalysis.structure;
          }
        }
      }
    });

    return bestStructure;
  }
}