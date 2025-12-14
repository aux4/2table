/**
 * ASCII Renderer - Dumb renderer that just reads Table cells and outputs ASCII format
 * Contains no JSON parsing logic - just renders cell contents with formatting
 */
export class AsciiRenderer {
  constructor(table) {
    this.table = table;
    this.colors = {
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      white: '\x1b[37m',
      black: '\x1b[30m',
      reset: '\x1b[0m'
    };
  }

  /**
   * Render the table as ASCII format
   */
  print() {
    // Use cell-based rendering
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
      // Special handling for hierarchical headers (row 2)
      if (rowNum === 2 && this.isHierarchicalHeader(rowNum)) {
        const line = this.renderHierarchicalHeaderRow(lineIndex, columnWidths);
        lines.push(line);
      } else {
        // Normal row rendering
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

          // Apply colors based on context and format
          if (displayContent && displayContent.trim()) {
            const colFormat = this.table.getFormat(this.table.numberToColumn(col));

            // Apply yellow color to headers (rows 1-3)
            if (this.isHeaderRow(rowNum)) {
              displayContent = this.applyColor(displayContent, 'yellow');
            }
            // Apply column-specific color to data rows if specified in structure
            else if (colFormat.color) {
              displayContent = this.applyColor(displayContent, colFormat.color);
            }
          }

          // Don't apply padding to the last column unless it's right-aligned
          const isLastColumn = col === this.table.maxColumn;
          const isRightAligned = format.align === 'right';
          const width = (isLastColumn && !isRightAligned) ? 0 : columnWidths[col];

          const formattedContent = this.formatCellContent(displayContent, width, format);
          lineParts.push(formattedContent);
        }

        // Join with double spaces but trim trailing spaces
        const line = lineParts.join('  ').trimEnd();
        // Add leading space to match expected ASCII format
        lines.push(' ' + line);
      }
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
    if (!width) return content;

    const cleanContent = this.removeAnsiCodes(content || '');
    const padding = Math.max(0, width - cleanContent.length);


    switch (align) {
      case 'right':
        return ' '.repeat(padding) + (content || '');
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + (content || '') + ' '.repeat(rightPad);
      case 'left':
      default:
        return (content || '') + ' '.repeat(padding);
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
   * Check if a row contains hierarchical headers (level 2+ headers)
   */
  isHierarchicalHeader(rowNum) {
    // Check if row 2 has content and row 1 has content (indicating hierarchical headers)
    if (rowNum !== 2) return false;

    // Check if there are headers in both row 1 and row 2
    let hasRow1Content = false;
    let hasRow2Content = false;
    let hasNumericData = false; // Check if row 2 contains numeric data (indicates data row, not header)

    for (let col = 0; col <= this.table.maxColumn; col++) {
      const row1CellRef = this.table.getCellReference(col, 1);
      const row2CellRef = this.table.getCellReference(col, 2);
      const row1Cell = this.table.getCell(row1CellRef);
      const row2Cell = this.table.getCell(row2CellRef);

      if (row1Cell.content.trim()) hasRow1Content = true;
      if (row2Cell.content.trim()) {
        hasRow2Content = true;
        // If row 2 contains numeric data, it's likely a data row, not a header row
        const cleanContent = this.removeAnsiCodes(row2Cell.content).trim();
        if (/^-?\d+(\.\d+)?$/.test(cleanContent)) {
          hasNumericData = true;
        }
      }
    }

    // If row 2 has numeric data, it's a data row, not a hierarchical header
    if (hasNumericData) {
      return false;
    }

    return hasRow1Content && hasRow2Content;
  }

  /**
   * Render hierarchical header row with proper indentation
   */
  renderHierarchicalHeaderRow(lineIndex, columnWidths) {
    const lineParts = [];
    let currentPosition = 0;

    // Find the first non-empty cell in row 2 to determine the starting position
    let firstNonEmptyCol = -1;
    for (let col = 0; col <= this.table.maxColumn; col++) {
      const cellRef = this.table.getCellReference(col, 2);
      const cell = this.table.getCell(cellRef);
      if (cell.content.trim()) {
        firstNonEmptyCol = col;
        break;
      }
    }

    // Calculate the indentation needed (sum of widths + spaces of preceding columns)
    let indentation = 0;
    for (let col = 0; col < firstNonEmptyCol; col++) {
      indentation += columnWidths[col] + 2; // +2 for double space separator
    }

    // Add the indentation (including the leading space)
    lineParts.push(' ' + ' '.repeat(indentation));

    // Render the header cells starting from the first non-empty column
    for (let col = firstNonEmptyCol; col <= this.table.maxColumn; col++) {
      if (col > firstNonEmptyCol) {
        lineParts.push('  '); // Add separator between headers
      }

      const cellRef = this.table.getCellReference(col, 2);
      const cell = this.table.getCell(cellRef);
      const format = this.table.getCellFormat(cellRef);

      // Get the line content for this line index
      const content = lineIndex < cell.multiline.length ? cell.multiline[lineIndex] : '';

      // Use original formatted content if available (for colors)
      let displayContent = content;
      if (format.originalContent && content === this.removeAnsiCodes(format.originalContent)) {
        displayContent = format.originalContent;
      }

      // Apply yellow color to header content
      if (displayContent && displayContent.trim()) {
        displayContent = this.applyColor(displayContent, 'yellow');
      }

      // Don't apply padding to the last column
      const isLastColumn = col === this.table.maxColumn;
      const width = isLastColumn ? 0 : columnWidths[col];
      const formattedContent = this.formatCellContent(displayContent, width, format);
      lineParts.push(formattedContent);
    }

    return lineParts.join('').trimEnd();
  }

  /**
   * Apply color to text based on color name
   */
  applyColor(text, colorName) {
    if (!text || !colorName) return text;

    const colorCode = this.colors[colorName.toLowerCase()];
    if (!colorCode) return text;

    return `${colorCode}${text}${this.colors.reset}`;
  }

  /**
   * Check if this row contains headers
   * Generic calculation based on where data starts
   */
  isHeaderRow(rowNum) {
    // Find the first row that contains data (not headers)
    // Data rows typically have numeric content or longer text content
    let firstDataRow = this.table.maxRow + 1; // Default to after last row

    for (let row = 1; row <= this.table.maxRow; row++) {
      let hasDataContent = false;

      for (let col = 0; col <= this.table.maxColumn; col++) {
        const cellRef = this.table.getCellReference(col, row);
        const cell = this.table.getCell(cellRef);
        const content = cell.content.trim();

        if (content) {
          // If the content is numeric or longer than typical header text, it's likely data
          if (/^\d+$/.test(content) || content.length > 20) {
            hasDataContent = true;
            break;
          }
        }
      }

      if (hasDataContent) {
        firstDataRow = row;
        break;
      }
    }

    // All rows before the first data row are headers
    return rowNum < firstDataRow;
  }

  /**
   * Remove ANSI color codes from text
   */
  removeAnsiCodes(text) {
    if (!text) return '';
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}