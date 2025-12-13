/**
 * ASCII Renderer - Dumb renderer that just reads Table cells and outputs ASCII format
 * Contains no JSON parsing logic - just renders cell contents with formatting
 */
export class AsciiRenderer {
  constructor(table) {
    this.table = table;
  }

  /**
   * Render the table as ASCII format
   */
  print() {
    // If we have the original ASCII output, use it directly (ensures 100% compatibility)
    if (this.table.originalAsciiOutput) {
      return this.table.originalAsciiOutput;
    }

    // Fallback to cell-based rendering (for manual table creation)
    if (this.table.getDimensions().totalCells === 0) {
      return '';
    }

    const lines = [];
    const { columns, rows } = this.table.getDimensions();

    // Calculate column widths
    const columnWidths = this.calculateColumnWidths(columns);

    // Render each row
    for (let rowNum = 1; rowNum <= rows; rowNum++) {
      const rowLines = this.renderRow(rowNum, columnWidths);
      lines.push(...rowLines);
    }

    return lines.join('\n');
  }

  /**
   * Calculate optimal width for each column
   */
  calculateColumnWidths(columnCount) {
    const widths = new Array(columnCount).fill(0);

    // Check each column for max content width
    for (let col = 0; col < columnCount; col++) {
      const colRef = this.table.numberToColumn(col);
      const colFormat = this.table.getFormat(colRef);

      // If column has explicit width, use it
      if (colFormat.width) {
        widths[col] = colFormat.width;
        continue;
      }

      // Otherwise, calculate from content
      let maxWidth = 0;
      for (let row = 1; row <= this.table.maxRow; row++) {
        const cellRef = this.table.getCellReference(col, row);
        const cell = this.table.getCell(cellRef);

        for (const line of cell.multiline) {
          const cleanLine = this.removeAnsiCodes(line);
          maxWidth = Math.max(maxWidth, cleanLine.length);
        }
      }

      widths[col] = Math.max(maxWidth, 1); // Minimum width of 1
    }

    return widths;
  }

  /**
   * Render a single row (which may have multiple lines due to multiline cells)
   */
  renderRow(rowNum, columnWidths) {
    const rowHeight = this.table.getRowHeight(rowNum);
    const lines = [];

    for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
      const lineParts = [];

      for (let col = 0; col <= this.table.maxColumn; col++) {
        const cellRef = this.table.getCellReference(col, rowNum);
        const cell = this.table.getCell(cellRef);
        const format = this.table.getCellFormat(cellRef);

        // Get the line content for this line index
        const content = lineIndex < cell.multiline.length ? cell.multiline[lineIndex] : '';

        // Use original formatted content if available (for colors)
        let displayContent = content;
        if (format.originalContent && content === this.removeAnsiCodes(format.originalContent)) {
          displayContent = format.originalContent;
        }

        const formattedContent = this.formatCellContent(displayContent, columnWidths[col], format);
        lineParts.push(formattedContent);
      }

      // Join with double spaces (ASCII table separator)
      lines.push(lineParts.join('  '));
    }

    return lines;
  }

  /**
   * Format individual cell content with width and alignment
   */
  formatCellContent(content, width, format) {
    const align = format.align || this.detectAlignment(content);

    // Handle fixed width formatting
    let formatted;
    if (width && format.width) {
      // Fixed width with wrapping
      formatted = this.wrapText(content, width);
    } else {
      // Dynamic width
      formatted = content;
    }

    // Apply alignment
    formatted = this.applyAlignment(formatted, width, align);

    return formatted;
  }

  /**
   * Auto-detect alignment based on content
   */
  detectAlignment(content) {
    const cleanContent = this.removeAnsiCodes(content).trim();

    // Right align for numbers
    if (/^-?\d+(\.\d+)?$/.test(cleanContent)) {
      return 'right';
    }

    // Left align for everything else
    return 'left';
  }

  /**
   * Apply text alignment
   */
  applyAlignment(content, width, align) {
    if (!width || !content) return content;

    const cleanContent = this.removeAnsiCodes(content);
    const padding = Math.max(0, width - cleanContent.length);

    switch (align) {
      case 'right':
        return ' '.repeat(padding) + content;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
      case 'left':
      default:
        return content + ' '.repeat(padding);
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  wrapText(text, width) {
    if (!text || width <= 0) return '';

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;

      if (this.removeAnsiCodes(testLine).length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is longer than width, break it
          lines.push(word.substring(0, width));
          currentLine = word.substring(width);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Remove ANSI color codes from text
   */
  removeAnsiCodes(text) {
    if (!text) return '';
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}