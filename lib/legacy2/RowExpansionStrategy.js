/**
 * Strategy pattern for determining how data items expand into table rows
 * Handles cases where nested arrays require multiple table rows
 */

import { ContentExtractor } from './ContentExtractor.js';
import { ContentTypeStrategy } from './ContentTypeStrategy.js';

export class RowExpansionStrategy {
  static getStrategy(dataItem, structure) {
    const hasExpandingArrays = RowExpansionStrategy.hasExpandingArrays(dataItem, structure);

    if (hasExpandingArrays) {
      return new MultiRowExpansionStrategy();
    } else {
      return new SingleRowExpansionStrategy();
    }
  }

  static hasExpandingArrays(dataItem, structure) {
    return structure.some(field => {
      return this.fieldHasExpandingArrays(dataItem, field);
    });
  }

  static fieldHasExpandingArrays(dataItem, field) {
    if (field.group) {
      const content = ContentExtractor.extract(dataItem, field.field || field.key);

      // Check if this field itself is an array with group structure
      if (ContentTypeStrategy.isArray(content)) {
        return true;
      }

      // Check if this field contains sub-fields that are arrays
      if (ContentTypeStrategy.isObject(content)) {
        return field.group.some(subField => {
          return this.fieldHasExpandingArrays(content, subField);
        });
      }
    }

    return false;
  }

  static expandDataItem(dataItem, structure) {
    const strategy = this.getStrategy(dataItem, structure);
    return strategy.expand(dataItem, structure);
  }
}

class SingleRowExpansionStrategy {
  expand(dataItem, structure) {
    // Single data item creates one row - return as-is
    return [dataItem];
  }
}

class MultiRowExpansionStrategy {
  expand(dataItem, structure) {
    // Find the field with the array that needs expansion
    const arrayField = this.findPrimaryArrayField(dataItem, structure);

    if (!arrayField) {
      return [dataItem]; // Fallback to single row
    }

    const extractPath = arrayField.fullPath || (arrayField.field || arrayField.key);
    const arrayContent = ContentExtractor.extract(dataItem, extractPath);

    if (!Array.isArray(arrayContent)) {
      return [dataItem]; // Fallback to single row
    }

    // Create one row for each array item
    return arrayContent.map((arrayItem, index) => {
      // Create a new data item where the array field is replaced with the single item
      const expandedItem = { ...dataItem };
      this.setNestedProperty(expandedItem, extractPath, arrayItem);

      // For continuation rows (index > 0), clear non-array fields to show only on first row
      if (index > 0) {
        this.clearNonArrayFields(expandedItem, structure, arrayField);
      }

      return expandedItem;
    });
  }

  findPrimaryArrayField(dataItem, structure) {
    // Find the first field that contains an array with group definition (including nested arrays)
    for (const field of structure) {
      const arrayField = this.findArrayFieldRecursive(dataItem, field);
      if (arrayField) {
        return arrayField;
      }
    }
    return null;
  }

  findArrayFieldRecursive(dataItem, field) {
    if (field.group) {
      const content = ContentExtractor.extract(dataItem, field.field || field.key);

      // Check if this field itself is an array
      if (ContentTypeStrategy.isArray(content)) {
        return field;
      }

      // Check nested fields if this is an object
      if (ContentTypeStrategy.isObject(content)) {
        for (const subField of field.group) {
          const nestedArrayField = this.findArrayFieldRecursive(content, subField);
          if (nestedArrayField) {
            // Return a modified field with the full path
            return {
              ...nestedArrayField,
              fullPath: `${field.field || field.key}.${nestedArrayField.field || nestedArrayField.key}`
            };
          }
        }
      }
    }
    return null;
  }

  setNestedProperty(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  clearNonArrayFields(expandedItem, structure, arrayField) {
    structure.forEach(field => {
      if (field !== arrayField && field.group) {
        // For grouped fields that aren't the array field, check if they should be cleared
        const content = ContentExtractor.extract(expandedItem, field.field || field.key);
        if (!ContentTypeStrategy.isArray(content)) {
          // Clear non-array grouped fields on continuation rows
          this.setNestedProperty(expandedItem, field.field || field.key, this.createEmptyObject(field));
        }
      } else if (field !== arrayField && !field.group) {
        // Clear simple fields on continuation rows
        this.setNestedProperty(expandedItem, field.field || field.key, '');
      }
    });
  }

  createEmptyObject(field) {
    const emptyObj = {};
    if (field.group) {
      field.group.forEach(subField => {
        emptyObj[subField.field] = '';
      });
    }
    return emptyObj;
  }
}