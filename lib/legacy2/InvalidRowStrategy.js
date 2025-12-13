/**
 * Invalid row rendering strategies using Strategy pattern
 * Manages rendering of entire invalid row as a single spanning cell
 */

import { Cell } from './Cell.js';
import { TableRow } from './TableRow.js';
import colors from 'colors';

export class InvalidRowStrategy {
  static getStrategy(isInvalidRow) {
    if (isInvalidRow) {
      return new InvalidRowRenderer();
    }
    return new NormalRowRenderer();
  }

  static createRow(item, structure, columnWidths, isInvalidRow) {
    const strategy = this.getStrategy(isInvalidRow);
    return strategy.createRow(item, structure, columnWidths);
  }
}

class NormalRowRenderer {
  createRow(item, structure, columnWidths) {
    // This should be handled by the TableBuilder directly
    // This strategy is just a passthrough for normal rows
    return null;
  }
}

class InvalidRowRenderer {
  createRow(item, structure, columnWidths) {
    const lineNumber = item.__lineNumber__;
    const cells = [];

    // Create line number cell if present
    if (structure[0] && structure[0].key === '__lineNumber__') {
      const lineNumberWidth = columnWidths['__lineNumber__'];
      const lineNumberCell = new Cell(String(lineNumber), lineNumberWidth, 'right', false);
      cells.push(lineNumberCell);

      // Calculate remaining width for the invalid line text
      const remainingStructure = structure.slice(1);
      const totalRemainingWidth = this.calculateTotalWidth(remainingStructure, columnWidths);

      // Create a single spanning cell for "<invalid line>" in red
      const invalidLineText = colors.red('<invalid line>');
      const invalidLineCell = new Cell(invalidLineText, totalRemainingWidth, 'left', true);
      cells.push(invalidLineCell);
    } else {
      // No line numbers - just create a single spanning cell
      const totalWidth = this.calculateTotalWidth(structure, columnWidths);
      const invalidLineText = colors.red('<invalid line>');
      const invalidLineCell = new Cell(invalidLineText, totalWidth, 'left', true);
      cells.push(invalidLineCell);
    }

    return new TableRow(cells);
  }

  calculateTotalWidth(structure, columnWidths) {
    let totalWidth = 0;
    structure.forEach((field, index) => {
      totalWidth += columnWidths[field.key];
      if (index < structure.length - 1) {
        totalWidth += 2; // Account for spacing between columns
      }
    });
    return totalWidth;
  }
}