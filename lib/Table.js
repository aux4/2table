/**
 * Excel-like Table with cell mapping system (A1, B2, etc.)
 * Cells are stored in a map with location keys like "A1", "B2"
 * Formatting is stored separately and can apply to cells (A1), columns (A), or rows (1)
 */
export class Table {
  constructor() {
    // Cell data mapping: "A1" -> { content: "value", multiline: ["line1", "line2"] }
    this.cells = new Map();

    // Formatting mapping: "A1", "A", "1" -> { width: 10, align: "left", color: "red" }
    this.formatting = new Map();

    // Track table dimensions
    this.maxColumn = 0; // A=0, B=1, C=2, etc.
    this.maxRow = 0;    // 1-based indexing
  }

  /**
   * Convert column letter(s) to number: A=0, B=1, ..., Z=25, AA=26, etc.
   */
  columnToNumber(col) {
    let result = 0;
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  /**
   * Convert column number to letter(s): 0=A, 1=B, ..., 25=Z, 26=AA, etc.
   */
  numberToColumn(num) {
    let result = '';
    while (num >= 0) {
      result = String.fromCharCode(num % 26 + 'A'.charCodeAt(0)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  }

  /**
   * Parse cell reference like "A1" into {column: 0, row: 1}
   */
  parseCellReference(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${ref}`);
    }
    return {
      column: this.columnToNumber(match[1]),
      row: parseInt(match[2])
    };
  }

  /**
   * Generate cell reference from column and row numbers
   */
  getCellReference(column, row) {
    return this.numberToColumn(column) + row;
  }

  /**
   * Set cell content. Content can be string or array for multiline
   */
  setCell(cellRef, content) {
    const { column, row } = this.parseCellReference(cellRef);

    // Update table dimensions
    this.maxColumn = Math.max(this.maxColumn, column);
    this.maxRow = Math.max(this.maxRow, row);

    // Store cell content
    if (Array.isArray(content)) {
      this.cells.set(cellRef, {
        content: content.join('\n'),
        multiline: content,
        height: content.length
      });
    } else {
      const lines = String(content).split('\n');
      this.cells.set(cellRef, {
        content: String(content),
        multiline: lines,
        height: lines.length
      });
    }
  }

  /**
   * Get cell content
   */
  getCell(cellRef) {
    return this.cells.get(cellRef) || { content: '', multiline: [''], height: 1 };
  }

  /**
   * Set formatting for cell, column, or row
   * Examples: "A1" (specific cell), "A" (entire column), "1" (entire row)
   */
  setFormat(target, format) {
    this.formatting.set(target, { ...this.getFormat(target), ...format });
  }

  /**
   * Get formatting for a specific target
   */
  getFormat(target) {
    return this.formatting.get(target) || {};
  }

  /**
   * Get effective formatting for a cell (combines cell, column, and row formatting)
   */
  getCellFormat(cellRef) {
    const { column, row } = this.parseCellReference(cellRef);
    const colRef = this.numberToColumn(column);
    const rowRef = String(row);

    // Combine formatting: row < column < cell (cell has highest priority)
    const rowFormat = this.getFormat(rowRef);
    const colFormat = this.getFormat(colRef);
    const cellFormat = this.getFormat(cellRef);

    return { ...rowFormat, ...colFormat, ...cellFormat };
  }

  /**
   * Move cell content from one location to another
   */
  moveCell(fromRef, toRef) {
    const cell = this.getCell(fromRef);
    const format = this.getFormat(fromRef);

    this.setCell(toRef, cell.multiline);
    if (Object.keys(format).length > 0) {
      this.setFormat(toRef, format);
    }

    this.cells.delete(fromRef);
    this.formatting.delete(fromRef);
  }

  /**
   * Shift all cells in a range
   */
  shiftCells(startCol, startRow, deltaCol, deltaRow) {
    const cellsToMove = [];

    // Find all cells that need to be moved
    for (const [cellRef, _] of this.cells) {
      const { column, row } = this.parseCellReference(cellRef);
      if (column >= startCol && row >= startRow) {
        cellsToMove.push({
          from: cellRef,
          to: this.getCellReference(column + deltaCol, row + deltaRow)
        });
      }
    }

    // Move cells (need to collect first to avoid modifying during iteration)
    for (const move of cellsToMove) {
      this.moveCell(move.from, move.to);
    }
  }

  /**
   * Insert a new row at the specified position (shifts existing rows down)
   */
  insertRow(atRow) {
    this.shiftCells(0, atRow, 0, 1);
    this.maxRow++;
  }

  /**
   * Insert a new column at the specified position (shifts existing columns right)
   */
  insertColumn(atCol) {
    this.shiftCells(atCol, 1, 1, 0);
    this.maxColumn++;
  }

  /**
   * Get all cells in a specific row
   */
  getRow(rowNum) {
    const cells = [];
    for (let col = 0; col <= this.maxColumn; col++) {
      const cellRef = this.getCellReference(col, rowNum);
      cells.push(this.getCell(cellRef));
    }
    return cells;
  }

  /**
   * Get all cells in a specific column
   */
  getColumn(colNum) {
    const cells = [];
    for (let row = 1; row <= this.maxRow; row++) {
      const cellRef = this.getCellReference(colNum, row);
      cells.push(this.getCell(cellRef));
    }
    return cells;
  }

  /**
   * Get the height of a row (max height of cells in that row)
   */
  getRowHeight(rowNum) {
    let maxHeight = 1;
    for (let col = 0; col <= this.maxColumn; col++) {
      const cellRef = this.getCellReference(col, rowNum);
      const cell = this.getCell(cellRef);
      maxHeight = Math.max(maxHeight, cell.height);
    }
    return maxHeight;
  }

  /**
   * Get table dimensions
   */
  getDimensions() {
    return {
      columns: this.maxColumn + 1,
      rows: this.maxRow,
      totalCells: this.cells.size
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.cells.clear();
    this.formatting.clear();
    this.maxColumn = 0;
    this.maxRow = 0;
  }

  /**
   * Debug: Print table structure
   */
  debug() {
    console.log('Table Dimensions:', this.getDimensions());
    console.log('Cells:');
    for (const [ref, cell] of this.cells) {
      console.log(`  ${ref}: ${JSON.stringify(cell.content)}`);
    }
    console.log('Formatting:');
    for (const [ref, format] of this.formatting) {
      console.log(`  ${ref}: ${JSON.stringify(format)}`);
    }
  }
}