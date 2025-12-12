/**
 * Data formatting strategies with access to column width information
 * Replaces ContentFormatter for nested structures where column alignment is needed
 */

import { ContentExtractor } from './ContentExtractor.js';
import { ContentTypeStrategy } from './ContentTypeStrategy.js';
import { StringFormattingStrategy } from './StringFormattingStrategy.js';

export class DataFormatter {
  static getStrategy(field) {
    if (field.group) {
      return new NestedDataFormatter();
    }
    return new SimpleDataFormatter();
  }

  static format(content, field, columnWidths, columnPosition = 0) {
    const strategy = this.getStrategy(field);
    return strategy.format(content, field, columnWidths, columnPosition);
  }
}

class SimpleDataFormatter {
  format(content, field, columnWidths, columnPosition = 0) {
    return ContentTypeStrategy.handle(content, { field });
  }
}

class NestedDataFormatter {
  format(content, field, columnWidths, columnPosition = 0) {
    if (!field.group) {
      return '[object Object]';
    }

    if (ContentTypeStrategy.isArray(content)) {
      // Handle array of objects - each array item becomes a line
      const lines = content.map(item => this.formatObjectLine(item, field, columnWidths));

      // Add left padding to continuation lines (all lines after the first)
      if (lines.length > 1) {
        const leftPadding = this.calculateLeftPadding(columnPosition);
        return lines.map((line, index) => {
          return index === 0 ? line : leftPadding + line;
        });
      }

      return lines;
    } else if (ContentTypeStrategy.isObject(content)) {
      // Handle single nested object
      // First check if this object contains any array fields that would need multi-line rendering
      const hasMultiLineFields = field.group && field.group.some(subField => {
        const value = ContentExtractor.extract(content, subField.field || subField.key);
        return ContentTypeStrategy.isArray(value) && subField.group;
      });

      if (hasMultiLineFields) {
        // This object contains array fields - handle them specially
        return this.formatObjectWithArrays(content, field, columnWidths);
      } else {
        // Standard single-line object formatting
        return this.formatObjectLine(content, field, columnWidths);
      }
    }

    return '[object Object]';
  }

  formatObjectWithArrays(obj, field, columnWidths) {
    // Handle objects that contain array fields requiring multi-line rendering
    // We need to process each field and determine the maximum number of lines needed

    const fieldResults = [];
    let maxLines = 1;

    field.group.forEach(subField => {
      const value = ContentExtractor.extract(obj, subField.field || subField.key);

      if (ContentTypeStrategy.isArray(value) && subField.group) {
        // This field is an array - format it and track line count
        const arrayResult = DataFormatter.format(value, subField, columnWidths);
        fieldResults.push({
          field: subField,
          value: arrayResult,
          isArray: true,
          lines: Array.isArray(arrayResult) ? arrayResult.length : 1
        });
        maxLines = Math.max(maxLines, Array.isArray(arrayResult) ? arrayResult.length : 1);
      } else {
        // Regular field - format as single value
        const formatted = ContentTypeStrategy.handle(value, { field: subField });
        fieldResults.push({
          field: subField,
          value: formatted,
          isArray: false,
          lines: 1
        });
      }
    });

    // Now create lines by combining fields across all rows
    const outputLines = [];
    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
      let line = '';

      fieldResults.forEach((result, fieldIndex) => {
        const isLastColumn = fieldIndex === fieldResults.length - 1;
        const subWidth = columnWidths[result.field.key];

        let cellValue = '';
        if (result.isArray && Array.isArray(result.value)) {
          // Get the appropriate line from the array, or empty if beyond array length
          cellValue = lineIndex < result.value.length ? result.value[lineIndex] : '';
        } else {
          // Single value - only show on first line
          cellValue = lineIndex === 0 ? result.value : '';
        }

        // Apply padding
        if (isLastColumn) {
          line += cellValue;
        } else {
          line += cellValue.padEnd(subWidth) + '  ';
        }
      });

      outputLines.push(line);
    }

    return outputLines;
  }

  calculateLeftPadding(columnPosition) {
    // columnPosition already includes the total character width needed
    return ' '.repeat(columnPosition);
  }

  formatObjectLine(obj, field, columnWidths) {
    let formattedLine = '';

    field.group.forEach((subField, index) => {
      const value = ContentExtractor.extract(obj, subField.field || subField.key);
      // For array elements, use the subField.key directly since columnWidths stores hierarchical keys
      const subWidth = columnWidths[subField.key];
      const isLastColumn = index === field.group.length - 1;

      let formattedValue = '';

      if ((ContentTypeStrategy.isObject(value) || ContentTypeStrategy.isArray(value)) && subField.group) {
        // Recursively format the nested object or array using its group definition
        formattedValue = DataFormatter.format(value, subField, columnWidths);
      } else {
        formattedValue = ContentTypeStrategy.handle(value, { field: subField });
      }

      // Ensure value is a string for padding operations
      formattedValue = StringFormattingStrategy.ensureString(formattedValue);

      // If formattedValue is still an array, this means we have multi-line content
      // that should be handled at the cell level, not within formatObjectLine
      // This indicates a structural issue - arrays should not reach this point in formatObjectLine

      // If formattedValue is an array, it means we have multi-line content that cannot
      // be processed within formatObjectLine. We need to handle this at a higher level.

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