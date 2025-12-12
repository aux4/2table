/**
 * Data formatting strategies with access to column width information
 * Replaces ContentFormatter for nested structures where column alignment is needed
 */

import { ContentExtractor } from './ContentExtractor.js';
import { ContentTypeStrategy } from './ContentTypeStrategy.js';

export class DataFormatter {
  static getStrategy(field) {
    if (field.group) {
      return new NestedDataFormatter();
    }
    return new SimpleDataFormatter();
  }

  static format(content, field, columnWidths) {
    const strategy = this.getStrategy(field);
    return strategy.format(content, field, columnWidths);
  }
}

class SimpleDataFormatter {
  format(content, field, columnWidths) {
    return ContentTypeStrategy.handle(content, { field });
  }
}

class NestedDataFormatter {
  format(content, field, columnWidths) {
    if (!field.group) {
      return '[object Object]';
    }

    if (ContentTypeStrategy.isArray(content)) {
      // Handle array of objects - each array item becomes a line
      return content.map(item => this.formatObjectLine(item, field, columnWidths));
    } else if (ContentTypeStrategy.isObject(content)) {
      // Handle single nested object
      return this.formatObjectLine(content, field, columnWidths);
    }

    return '[object Object]';
  }

  formatObjectLine(obj, field, columnWidths) {
    let formattedLine = '';

    field.group.forEach((subField, index) => {
      const value = ContentExtractor.extract(obj, subField.field || subField.key);
      const subWidth = columnWidths[subField.key];
      const isLastColumn = index === field.group.length - 1;

      let formattedValue = '';

      if (ContentTypeStrategy.isObject(value) && subField.group) {
        // Recursively format the nested object using its group definition
        formattedValue = DataFormatter.format(value, subField, columnWidths);
      } else {
        formattedValue = ContentTypeStrategy.handle(value, { field: subField });
      }

      // Apply alignment based on value type
      const isNumeric = ContentTypeStrategy.isNumber(value);

      if (isLastColumn) {
        // Last column: apply alignment but no trailing spaces
        if (isNumeric) {
          formattedLine += formattedValue.padStart(subWidth);
        } else {
          formattedLine += formattedValue; // No padding for non-numeric last column
        }
      } else {
        // Non-last column: apply alignment with spacing
        if (isNumeric) {
          formattedLine += formattedValue.padStart(subWidth);
        } else {
          formattedLine += formattedValue.padEnd(subWidth);
        }
        formattedLine += '  '; // 2 spaces between columns
      }
    });

    return formattedLine;
  }
}