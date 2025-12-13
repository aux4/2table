/**
 * Structure Parser for handling complex table structure definitions
 * Supports:
 * - Simple fields: "name,age,city"
 * - Nested objects: "name,address[street,city,state]"
 * - Column formatting: "name{width:20},description{width:30}"
 * - Column renaming: "name:Full Name,age:Years"
 */
export class StructureParser {
  /**
   * Parse structure string into a structured format
   */
  static parseStructure(structure) {
    if (!structure || structure.trim() === '') {
      return [];
    }

    return this.parseFields(structure);
  }

  /**
   * Parse comma-separated fields with potential nesting
   */
  static parseFields(fieldsString) {
    const fields = [];
    let currentField = '';
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < fieldsString.length; i++) {
      const char = fieldsString[i];

      if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      } else if (char === ',' && bracketDepth === 0 && braceDepth === 0) {
        // Top-level comma - this separates fields
        if (currentField.trim()) {
          fields.push(this.parseField(currentField.trim()));
        }
        currentField = '';
        continue;
      }

      currentField += char;
    }

    // Add the last field
    if (currentField.trim()) {
      fields.push(this.parseField(currentField.trim()));
    }

    return fields;
  }

  /**
   * Parse a single field definition
   */
  static parseField(fieldString) {
    // Extract formatting info first
    const formatMatch = fieldString.match(/\{([^}]+)\}$/);
    let format = {};
    let cleanField = fieldString;

    if (formatMatch) {
      cleanField = fieldString.replace(/\{[^}]+\}$/, '');
      format = this.parseFormat(formatMatch[1]);
    }

    // Extract renaming info
    const renameMatch = cleanField.match(/^([^:]+):(.+)$/);
    let field = cleanField;
    let name = null;

    if (renameMatch) {
      field = renameMatch[1].trim();
      name = renameMatch[2].trim();
    }

    // Check for nested structure
    const nestMatch = field.match(/^([^[]+)\[(.+)\]$/);

    if (nestMatch) {
      // Nested field
      const fieldName = nestMatch[1].trim();
      const nestedFields = nestMatch[2];

      return {
        field: fieldName,
        name: name || fieldName,
        group: this.parseFields(nestedFields),
        format: format
      };
    } else {
      // Simple field
      return {
        field: field.trim(),
        name: name || field.trim(),
        format: format
      };
    }
  }

  /**
   * Parse formatting string like "width:20,align:right"
   */
  static parseFormat(formatString) {
    const format = {};
    const parts = formatString.split(',');

    for (const part of parts) {
      const [key, value] = part.split(':').map(s => s.trim());
      if (key && value) {
        if (key === 'width') {
          format.width = parseInt(value);
        } else if (key === 'align') {
          format.align = value;
        } else if (key === 'color') {
          format.color = value;
        } else {
          format[key] = value;
        }
      }
    }

    return format;
  }

  /**
   * Count total number of leaf columns in the structure
   */
  static countLeafColumns(structure) {
    let count = 0;
    for (const field of structure) {
      if (field.group) {
        count += this.countLeafColumns(field.group);
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Get all leaf fields from the structure
   */
  static getLeafFields(structure) {
    const leaves = [];
    for (const field of structure) {
      if (field.group) {
        const childLeaves = this.getLeafFields(field.group);
        leaves.push(...childLeaves);
      } else {
        leaves.push(field);
      }
    }
    return leaves;
  }

  /**
   * Extract values for leaf fields from a data object
   */
  static extractDataValues(dataObject, structure) {
    const values = [];

    function extractFromFields(fields, obj, path = '') {
      for (const field of fields) {
        if (field.group) {
          // Navigate into nested object
          const currentPath = path ? `${path}.${field.field}` : field.field;
          const nestedObj = StructureParser.extractValue(obj, currentPath);

          if (Array.isArray(nestedObj)) {
            // Handle array of objects - extract from each item
            const arrayValues = [];
            for (const item of nestedObj) {
              const itemValues = [];
              extractFromFields(field.group, item, '');
              itemValues.push(...values.splice(-field.group.length));
              arrayValues.push(itemValues);
            }
            values.push(arrayValues);
          } else {
            extractFromFields(field.group, nestedObj || {}, '');
          }
        } else {
          // Leaf field - extract the value
          const currentPath = path ? `${path}.${field.field}` : field.field;
          const value = StructureParser.extractValue(obj, currentPath);
          values.push(value);
        }
      }
    }

    extractFromFields(structure, dataObject);
    return values;
  }

  /**
   * Extract value using dot notation
   */
  static extractValue(obj, path) {
    if (!path || !obj) return '';

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }
      current = current[part];
    }

    return current === undefined ? '' : current;
  }
}