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
    // First pass: identify all array fields and their maximum length
    const fieldResults = [];
    let maxLines = 1;

    field.group.forEach(subField => {
      const value = ContentExtractor.extract(obj, subField.field || subField.key);

      if (ContentTypeStrategy.isArray(value)) {
        if (subField.group) {
          // Array with group structure - each array item becomes a formatted line
          const formattedItems = value.map(item => {
            return this.formatObjectLine(item, subField, columnWidths);
          });

          fieldResults.push({
            field: subField,
            value: formattedItems,
            isArray: true,
            lines: formattedItems.length
          });
          maxLines = Math.max(maxLines, formattedItems.length);
        } else {
          // Array without group structure - each item becomes a simple value
          const formattedItems = value.map(item => {
            return ContentTypeStrategy.handle(item, { field: subField });
          });

          fieldResults.push({
            field: subField,
            value: formattedItems,
            isArray: true,
            lines: formattedItems.length
          });
          maxLines = Math.max(maxLines, formattedItems.length);
        }
      } else {
        // Regular field - check if it has nested structure and valid data
        // Only apply recursive formatting for actual objects with group structure
        if (subField.group &&
            value !== null &&
            value !== undefined &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).length > 0) {
          // Object with group structure - format recursively
          const formatted = DataFormatter.format(value, subField, columnWidths);
          fieldResults.push({
            field: subField,
            value: formatted,
            isArray: false,
            lines: 1
          });
        } else {
          // Simple field - format as single value
          const formatted = ContentTypeStrategy.handle(value, { field: subField });
          fieldResults.push({
            field: subField,
            value: formatted,
            isArray: false,
            lines: 1
          });
        }
      }
    });

    // Create lines by combining fields across all rows
    const outputLines = [];
    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
      let line = '';

      fieldResults.forEach((result, fieldIndex) => {
        const isLastColumn = fieldIndex === fieldResults.length - 1;
        const subWidth = columnWidths[result.field.key];

        let cellValue = '';
        if (result.isArray && Array.isArray(result.value)) {
          cellValue = lineIndex < result.value.length ? result.value[lineIndex] : '';
        } else {
          cellValue = lineIndex === 0 ? result.value : '';
        }

        // Apply padding and spacing - key fix for spacing issue
        if (isLastColumn) {
          // Last column - no trailing spaces needed
          line += cellValue;
        } else {
          // Non-last column - always pad to maintain column alignment
          line += cellValue.padEnd(subWidth) + '  ';
        }
      });

      // Trim trailing whitespace to prevent gaps in table alignment
      outputLines.push(line.trimEnd());
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
      const extractPath = subField.field || subField.key;
      const value = ContentExtractor.extract(obj, extractPath);
      // For array elements, use the subField.key directly since columnWidths stores hierarchical keys
      const subWidth = columnWidths[subField.key];
      const isLastColumn = index === field.group.length - 1;

      let formattedValue = '';

      let isPreFormatted = false;
      if ((ContentTypeStrategy.isObject(value) || ContentTypeStrategy.isArray(value)) && subField.group) {
        // Recursively format the nested object or array using its group definition
        formattedValue = DataFormatter.format(value, subField, columnWidths);
        isPreFormatted = true; // This value is already formatted with internal spacing
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

      if (isPreFormatted) {
        // Pre-formatted values (from recursive formatting) need proper column alignment
        if (isLastColumn) {
          // Last column: no trailing spaces needed
          formattedLine += formattedValue;
        } else {
          // Non-last column: pad to column width and add separator spaces
          formattedLine += formattedValue.padEnd(subWidth) + '  ';
        }
      } else {
        // Regular values need alignment and padding
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
      }
    });

    return formattedLine;
  }
}