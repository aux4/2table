/**
 * Markdown Renderer - Enhanced renderer with colspan support using [n] syntax
 * Contains no JSON parsing logic - just renders cell contents as markdown table
 * Ignores colors and width formatting as requested
 * Supports multi-level headers with automatic colspan detection
 */
export class MarkdownRenderer {
  constructor(table) {
    this.table = table;
  }

  /**
   * Render the table as Markdown format with colspan support
   */
  print() {
    if (this.table.getDimensions().totalCells === 0) {
      return '';
    }

    const lines = [];
    const { columns, rows } = this.table.getDimensions();

    // Determine if we have multi-level headers
    const isMultiLevelHeader = this.hasMultiLevelHeaders(rows);

    if (isMultiLevelHeader) {
      // Enhanced rendering for multi-level headers with colspan
      this.renderMultiLevelHeaders(lines, columns, rows);
    } else {
      // Standard rendering for simple tables
      this.renderStandardTable(lines, columns, rows);
    }

    return lines.join('\n');
  }

  /**
   * Check if table has multi-level headers (header rows with hierarchical structure)
   */
  hasMultiLevelHeaders(totalRows) {
    if (totalRows < 3) return false; // Need at least 3 rows: header1, header2, data

    const { columns } = this.table.getDimensions();
    const lastHeaderRow = this.findLastHeaderRow(totalRows, columns);

    if (lastHeaderRow < 2) return false; // Need at least 2 header rows

    // Simple detection: if we have more than 1 header row, it's multi-level
    // The ASCII renderer already handles the hierarchical structure correctly
    return true;
  }

  /**
   * Check if a row has hierarchical pattern (parent headers with children below)
   */
  hasHierarchicalPattern(rowNum, columns, lastHeaderRow) {
    for (let col = 0; col < columns; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);

      if (cell.content.trim()) {
        // This cell has content, check if it has children in subsequent rows
        if (this.hasChildHeadersBelow(rowNum, col, lastHeaderRow)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detect if a row has cells that should span multiple columns
   */
  detectColspanInRow(rowNum) {
    const { columns } = this.table.getDimensions();
    const cellValues = [];

    for (let col = 0; col < columns; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);
      cellValues.push(cell.content.trim());
    }

    // Look for patterns where a non-empty cell is followed by empty cells
    // indicating it should span across those empty cells
    for (let i = 0; i < cellValues.length - 1; i++) {
      if (cellValues[i] && !cellValues[i + 1]) {
        let spanCount = 1;
        for (let j = i + 1; j < cellValues.length && !cellValues[j]; j++) {
          spanCount++;
        }
        if (spanCount > 1) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Render multi-level headers with proper multi-row colspan support
   */
  renderMultiLevelHeaders(lines, columns, totalRows) {
    // Find the last header row (first row with data pattern)
    let lastHeaderRow = this.findLastHeaderRow(totalRows, columns);

    // Render each header row with proper colspan for that specific row
    for (let rowNum = 1; rowNum <= lastHeaderRow; rowNum++) {
      const colspanRow = this.renderMultiRowHeaderWithColspan(rowNum, columns, lastHeaderRow);
      lines.push(colspanRow);
    }

    // Add separator after headers
    const separator = this.createHeaderSeparator(columns);
    lines.push(separator);

    // Render remaining data rows
    for (let rowNum = lastHeaderRow + 1; rowNum <= totalRows; rowNum++) {
      const rowLines = this.renderRow(rowNum, columns);
      lines.push(...rowLines);
    }
  }

  /**
   * Find the last row that contains headers (before data starts)
   */
  findLastHeaderRow(totalRows, columns) {
    // Look for the first row that contains actual data values (not header names)
    for (let row = 1; row <= totalRows; row++) {
      const isDataRow = this.isDataRow(row, columns);
      if (isDataRow) {
        return row - 1; // Previous row is the last header row
      }
    }
    return totalRows - 1; // If no clear data row found, assume last row is data
  }

  /**
   * Check if a row contains actual data (not header labels)
   */
  isDataRow(rowNum, columnCount) {
    let nonEmptyCount = 0;
    let hasComplexData = false;

    for (let col = 0; col < columnCount; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);
      const content = cell.content.trim();

      if (content) {
        nonEmptyCount++;

        // More specific data detection: look for clear data indicators
        // Numbers, spaces, long text, or mixed case with actual content
        if (/\d/.test(content) ||
            content.includes(' ') ||
            content.length > 15 ||
            (content.includes('@') || content.includes('.com') || content.includes('-'))) {
          hasComplexData = true;
        }
      }
    }

    // A data row needs some filled cells AND clear data indicators
    return nonEmptyCount >= Math.floor(columnCount * 0.25) && hasComplexData;
  }

  /**
   * Render a specific header row with colspan, considering the multi-row context
   */
  renderMultiRowHeaderWithColspan(currentRow, columns, lastHeaderRow) {
    const cellContents = [];
    let col = 0;

    while (col < columns) {
      const cellRef = this.table.getCellReference(col, currentRow);
      const cell = this.table.getCell(cellRef);
      const content = this.cleanContentForMarkdown(cell.content);

      if (!content) {
        // Empty cell - add empty content and move to next column
        cellContents.push('');
        col++;
      } else {
        // Calculate colspan for this specific header cell in multi-row context
        const spanCount = this.calculateMultiRowColspan(currentRow, col, columns, lastHeaderRow);

        if (spanCount > 1) {
          // Add colspan notation: "Content [n]"
          cellContents.push(`${content} [${spanCount}]`);
          // Skip the spanned columns
          col += spanCount;
        } else {
          // Single cell
          cellContents.push(content);
          col++;
        }
      }
    }

    return '| ' + cellContents.join(' | ') + ' |';
  }

  /**
   * Calculate colspan for a cell in multi-row header context
   * This considers how many columns this header should span based on its children in subsequent rows
   */
  calculateMultiRowColspan(currentRow, startCol, totalColumns, lastHeaderRow) {
    const cellRef = this.table.getCellReference(startCol, currentRow);
    const cell = this.table.getCell(cellRef);

    if (!cell.content.trim()) {
      return 1;
    }

    // First check if this header actually has child headers below it
    // Only parent headers should have colspan, not leaf headers
    const hasChildHeaders = this.hasChildHeadersBelow(currentRow, startCol, lastHeaderRow);
    if (!hasChildHeaders) {
      return 1; // Leaf headers don't get colspan
    }

    // For parent headers, count how many columns they should span
    let spanCount = 1;

    // Look ahead to find the span by checking subsequent rows for child headers
    for (let col = startCol + 1; col < totalColumns; col++) {
      const shouldIncludeInSpan = this.shouldColumnBeIncludedInSpan(
        currentRow, startCol, col, lastHeaderRow
      );

      if (shouldIncludeInSpan) {
        spanCount++;
      } else {
        break;
      }
    }

    return spanCount;
  }

  /**
   * Check if a header has child headers in rows below it
   * This includes checking adjacent columns that might be part of the span
   */
  hasChildHeadersBelow(currentRow, col, lastHeaderRow) {
    const { columns } = this.table.getDimensions();

    // Look at the rows below this header to see if there are child headers
    for (let row = currentRow + 1; row <= lastHeaderRow; row++) {
      // Check current column
      const childCellRef = this.table.getCellReference(col, row);
      const childCell = this.table.getCell(childCellRef);

      if (childCell.content.trim()) {
        // Found a child header directly below
        return true;
      }

      // Also check adjacent columns to see if they have children
      // This handles cases where parent header spans multiple child columns
      for (let checkCol = col + 1; checkCol < columns && checkCol < col + 5; checkCol++) {
        const adjCellRef = this.table.getCellReference(checkCol, row);
        const adjCell = this.table.getCell(adjCellRef);

        if (adjCell.content.trim()) {
          // Check if this adjacent column is empty in the current header row
          const parentAdjRef = this.table.getCellReference(checkCol, currentRow);
          const parentAdjCell = this.table.getCell(parentAdjRef);

          if (!parentAdjCell.content.trim()) {
            // Adjacent column is empty in parent row but has content in child row
            // This suggests it's a child of our current header
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Determine if a column should be included in the span of a header cell
   */
  shouldColumnBeIncludedInSpan(headerRow, spanStartCol, testCol, lastHeaderRow) {
    // Check if the test column is part of the same logical group as spanStartCol

    // First, check if there's a non-empty header at testCol in the current row
    const currentRowCell = this.table.getCellReference(testCol, headerRow);
    const currentCell = this.table.getCell(currentRowCell);

    if (currentCell.content.trim()) {
      // There's content here, so this should not be part of the span
      return false;
    }

    // Check if this column is empty throughout the remaining header rows
    // If it's empty in all remaining header rows, it should be part of the span
    let hasContentInLaterRows = false;
    for (let row = headerRow + 1; row <= lastHeaderRow; row++) {
      const testCellRef = this.table.getCellReference(testCol, row);
      const testCell = this.table.getCell(testCellRef);

      if (testCell.content.trim()) {
        hasContentInLaterRows = true;
        break;
      }
    }

    // If the column is empty in all subsequent header rows, include it in span
    // If it has content in later rows, check if it logically belongs under the span
    if (!hasContentInLaterRows) {
      return true;
    }

    // Check if this column's content belongs under the current span
    // by verifying the hierarchical relationship
    return this.isColumnUnderHierarchy(spanStartCol, testCol, headerRow, lastHeaderRow);
  }

  /**
   * Check if a column is hierarchically under another column's span
   */
  isColumnUnderHierarchy(parentCol, childCol, startRow, lastHeaderRow) {
    // Look for the parent header and see if child columns fall under its logical span
    // This is determined by checking if there are empty cells above the child content
    // in the hierarchy leading up to the parent

    for (let row = startRow; row <= lastHeaderRow; row++) {
      const childCellRef = this.table.getCellReference(childCol, row);
      const childCell = this.table.getCell(childCellRef);

      if (childCell.content.trim()) {
        // Found content in the child column at this row
        // Check if all cells above it (between startRow and this row) are empty
        let allEmptyAbove = true;
        for (let checkRow = startRow; checkRow < row; checkRow++) {
          const checkCellRef = this.table.getCellReference(childCol, checkRow);
          const checkCell = this.table.getCell(checkCellRef);
          if (checkCell.content.trim()) {
            allEmptyAbove = false;
            break;
          }
        }

        // Also check if we're within a reasonable distance from the parent
        const distance = childCol - parentCol;
        return allEmptyAbove && distance <= 3; // Reasonable span distance
      }
    }

    return false;
  }

  /**
   * Render standard table without colspan
   */
  renderStandardTable(lines, columns, totalRows) {
    // Render each row
    for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
      const rowLines = this.renderRow(rowNum, columns);
      lines.push(...rowLines);

      // Add separator after first row (header separator)
      if (rowNum === 1) {
        const separator = this.createHeaderSeparator(columns);
        lines.push(separator);
      }
    }
  }

  /**
   * Create header separator line (| --- | --- | --- |) with alignment
   */
  createHeaderSeparator(columnCount) {
    const separators = [];
    for (let col = 0; col < columnCount; col++) {
      const colRef = this.table.numberToColumn(col);
      const format = this.table.getFormat(colRef);

      // Create separator based on alignment
      if (format.align === 'right') {
        separators.push('---:');
      } else if (format.align === 'center') {
        separators.push(':---:');
      } else {
        separators.push('---'); // left align (default)
      }
    }
    return '| ' + separators.join(' | ') + ' |';
  }

  /**
   * Render a row with colspan support using [n] syntax
   */
  renderRowWithColspan(rowNum, columnCount) {
    const cellContents = [];
    let col = 0;

    while (col < columnCount) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);
      const content = this.cleanContentForMarkdown(cell.content);

      if (!content) {
        // Empty cell
        cellContents.push('');
        col++;
      } else {
        // Check if this cell should span multiple columns
        const spanCount = this.calculateColspan(rowNum, col, columnCount);

        if (spanCount > 1) {
          // Add colspan notation: "Content [n]"
          cellContents.push(`${content} [${spanCount}]`);
          // Skip the spanned columns
          col += spanCount;
        } else {
          // Single cell
          cellContents.push(content);
          col++;
        }
      }
    }

    return '| ' + cellContents.join(' | ') + ' |';
  }

  /**
   * Calculate how many columns a cell should span
   */
  calculateColspan(rowNum, startCol, totalColumns) {
    const cellRef = this.table.getCellReference(startCol, rowNum);
    const cell = this.table.getCell(cellRef);

    if (!cell.content.trim()) {
      return 1;
    }

    // Count consecutive empty cells to the right
    let spanCount = 1;
    for (let col = startCol + 1; col < totalColumns; col++) {
      const nextCellRef = this.table.getCellReference(col, rowNum);
      const nextCell = this.table.getCell(nextCellRef);

      if (nextCell.content.trim() === '') {
        spanCount++;
      } else {
        break;
      }
    }

    return spanCount;
  }

  /**
   * Check if a row is completely empty
   */
  isRowEmpty(rowNum, columnCount) {
    for (let col = 0; col < columnCount; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);
      if (cell.content.trim()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if row has a typical data pattern (not all empty, not all filled)
   */
  rowHasDataPattern(rowNum, columnCount) {
    let filledCells = 0;
    for (let col = 0; col < columnCount; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
      const cell = this.table.getCell(cellRef);
      if (cell.content.trim()) {
        filledCells++;
      }
    }

    // Data rows typically have most cells filled
    return filledCells >= Math.floor(columnCount * 0.5);
  }

  /**
   * Render a single row (which may have multiple lines due to multiline cells)
   */
  renderRow(rowNum, columnCount) {
    const rowHeight = this.table.getRowHeight(rowNum);
    const lines = [];

    for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
      const cellContents = [];

      for (let col = 0; col < columnCount; col++) {
        const cellRef = this.table.getCellReference(col, rowNum);
        const cell = this.table.getCell(cellRef);

        // Get the line content for this line index (ignore formatting for MD)
        const content = lineIndex < cell.multiline.length ? cell.multiline[lineIndex] : '';
        const cleanContent = this.cleanContentForMarkdown(content);
        cellContents.push(cleanContent);
      }

      // Create markdown row: | cell1 | cell2 | cell3 |
      const markdownLine = '| ' + cellContents.join(' | ') + ' |';
      lines.push(markdownLine);
    }

    return lines;
  }

  /**
   * Clean content for markdown (remove ANSI codes and escape markdown characters)
   */
  cleanContentForMarkdown(content) {
    if (!content) return '';

    // Remove ANSI color codes
    let cleaned = content.replace(/\x1b\[[0-9;]*m/g, '');

    // Escape markdown special characters in table cells
    cleaned = cleaned
      .replace(/\|/g, '\\|')  // Escape pipes
      .replace(/\n/g, ' ')    // Replace newlines with spaces in markdown tables
      .trim();

    return cleaned;
  }
}