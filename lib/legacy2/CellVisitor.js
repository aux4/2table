/**
 * Visitor pattern for cell rendering context communication
 * Allows cells to adjust their behavior based on position context
 */

export class CellRenderContext {
  constructor(isLastColumn = false, isLastRow = false) {
    this.isLastColumn = isLastColumn;
    this.isLastRow = isLastRow;
  }
}

export class CellVisitor {
  visitCell(cell, context) {
    return cell.renderWithContext(context);
  }
}