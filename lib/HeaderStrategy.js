/**
 * Header creation strategies using Strategy pattern
 * Separate implementations for different header types
 */

import { Cell } from './Cell.js';
import colors from 'colors';

export class HeaderStrategy {
  static getStrategy(field) {
    if (field.group) {
      return new MultiLevelHeaderStrategy();
    }
    return new SimpleHeaderStrategy();
  }

  static createHeader(field, width, isLastColumn, columnWidths) {
    const strategy = this.getStrategy(field);
    return strategy.createHeader(field, width, isLastColumn, columnWidths);
  }
}

class SimpleHeaderStrategy {
  createHeader(field, width, isLastColumn, columnWidths) {
    const label = colors.yellow(field.label || field.key);
    return new Cell(label, width, 'left', isLastColumn);
  }
}

class MultiLevelHeaderStrategy {
  createHeader(field, width, isLastColumn, columnWidths) {
    const topLabel = colors.yellow(field.label || field.key);
    const headerLines = [topLabel];

    // Build all header levels recursively
    this.buildAllHeaderLevels(field, columnWidths, headerLines, 1);

    return new Cell(headerLines, width, 'left', isLastColumn);
  }

  buildAllHeaderLevels(field, columnWidths, headerLines, level) {
    if (!field.group) return;

    // Build the current level header line
    const currentLevelLine = this.buildAlignedSubHeaders(field, columnWidths);

    // Ensure we have enough header lines
    while (headerLines.length <= level) {
      headerLines.push('');
    }
    headerLines[level] = currentLevelLine;

    // Check if any sub-fields have their own groups (deeper nesting)
    const hasDeepNesting = field.group.some(subField => subField.group);

    if (hasDeepNesting) {
      // Build the next level for fields that have groups
      this.buildNextLevel(field, columnWidths, headerLines, level + 1);
    }
  }

  buildNextLevel(parentField, columnWidths, headerLines, level) {
    // Ensure we have enough header lines
    while (headerLines.length <= level) {
      headerLines.push('');
    }

    let nextLevelLine = '';

    parentField.group.forEach((subField, index) => {
      const subWidth = columnWidths[subField.key];
      const isLastSubField = index === parentField.group.length - 1;

      if (subField.group) {
        // This sub-field has its own group, build its header
        const subHeaderLine = this.buildAlignedSubHeaders(subField, columnWidths);

        if (isLastSubField) {
          // Last sub-field: no padding/spacing needed
          nextLevelLine += subHeaderLine;
        } else {
          // Non-last sub-field: ensure proper spacing by padding to full column width
          // The subHeaderLine might be shorter than subWidth, so pad it out
          // Use getDisplayLength to account for ANSI color codes
          const actualLength = this.getDisplayLength(subHeaderLine);
          const paddingNeeded = subWidth - actualLength;
          const paddedSubHeader = subHeaderLine + ''.padEnd(Math.max(0, paddingNeeded));
          nextLevelLine += paddedSubHeader + '  ';
        }
      } else {
        // This sub-field doesn't have a group, pad with spaces
        if (isLastSubField) {
          // Last sub-field: no trailing spaces
          nextLevelLine += '';
        } else {
          // Non-last sub-field: pad to column width plus spacing
          nextLevelLine += ''.padEnd(subWidth + 2);
        }
      }
    });

    headerLines[level] = nextLevelLine;
  }

  buildAlignedSubHeaders(field, columnWidths) {
    const totalWidth = columnWidths[field.key];
    let subHeaderLine = '';
    let currentPosition = 0;

    field.group.forEach((subField, index) => {
      const subWidth = columnWidths[subField.key];
      const subLabel = colors.yellow(subField.label || subField.key);
      const displayLength = this.getDisplayLength(subLabel);
      const isLastSubField = index === field.group.length - 1;

      // Position the sub-header to align with its data column
      // Left-align the sub-header within its column space
      if (isLastSubField) {
        // Last sub-field: no trailing spaces to avoid trailing whitespace
        subHeaderLine += subLabel;
      } else {
        // Non-last sub-field: pad to column width
        const paddedSubLabel = subLabel.padEnd(subWidth - displayLength + subLabel.length);
        subHeaderLine += paddedSubLabel;
        subHeaderLine += '  '; // 2 spaces between columns
      }

      currentPosition += subWidth;

      // Add spacing between columns (except for last) - moved into else block above
      if (!isLastSubField) {
        currentPosition += 2;
      }
    });

    return subHeaderLine;
  }

  padSubLabel(subLabel, subWidth) {
    const displayLength = this.getDisplayLength(subLabel);
    return subLabel.padEnd(subWidth - displayLength + subLabel.length);
  }

  getDisplayLength(text) {
    if (typeof text !== 'string') return 0;
    // Remove ANSI escape sequences for accurate length calculation
    return text.replace(/\u001b\[[0-9;]*m/g, '').length;
  }
}