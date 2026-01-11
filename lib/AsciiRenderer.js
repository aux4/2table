/**
 * ASCII Renderer - Dumb renderer that just reads Table cells and outputs ASCII format
 * Contains no JSON parsing logic - just renders cell contents with formatting
 */

export class AsciiRenderer {
  constructor(table, structure = '') {
    this.table = table;
    this.structure = structure;
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

    // Performance optimization: Multiple caching layers
    this.ansiCache = new Map();
    this.lengthCache = new Map();
    this.cellCache = new Map();        // Cache formatted cell content
    this.rowCache = new Map();         // Cache rendered row segments
    this.colorCache = new Map();       // Cache color-applied text

    // Pre-compute dimensions and format data
    this.dimensions = this.table.getDimensions();
    this.formatCache = new Map();      // Cache column formats
  }

  /**
   * Render the table as ASCII format
   */
  print() {
    // Use cell-based rendering
    if (this.dimensions.totalCells === 0) {
      return '';
    }

    const lines = [];
    const { columns, rows } = this.dimensions;

    // Pre-compute all column formats for caching
    this.precomputeColumnFormats(columns);

    // Calculate column widths (optimized)
    const columnWidths = this.calculateColumnWidthsOptimized(columns);

    // Batch row processing for wide tables (optimization for 10+ columns)
    if (columns >= 10) {
      return this.renderRowsBatched(rows, columnWidths);
    }

    // Normal rendering for narrow tables
    for (let rowNum = 1; rowNum <= rows; rowNum++) {
      const rowLines = this.renderRowOptimized(rowNum, columnWidths);
      lines.push(...rowLines);
    }

    return lines.join('\n');
  }

  /**
   * Pre-compute column formats for caching
   */
  precomputeColumnFormats(columnCount) {
    for (let col = 0; col < columnCount; col++) {
      const colRef = this.table.numberToColumn(col);
      const colFormat = this.table.getFormat(colRef);
      this.formatCache.set(col, colFormat);
    }
  }

  /**
   * Optimized column width calculation with caching
   */
  calculateColumnWidthsOptimized(columnCount) {
    const widths = new Array(columnCount).fill(0);
    const maxWidthCache = new Map();

    // Process columns in parallel-style batches
    for (let col = 0; col < columnCount; col++) {
      const colFormat = this.formatCache.get(col);

      // If column has explicit width, use it
      if (colFormat.width) {
        widths[col] = colFormat.width;
        continue;
      }

      // Check cache first
      const cacheKey = `width_${col}`;
      if (maxWidthCache.has(cacheKey)) {
        widths[col] = maxWidthCache.get(cacheKey);
        continue;
      }

      // Calculate from content (optimized)
      let maxWidth = 0;
      for (let row = 1; row <= this.table.maxRow; row++) {
        const cellRef = this.table.getCellReference(col, row);
        const cell = this.table.getCell(cellRef);

        // Use cached length computation
        for (const line of cell.multiline) {
          maxWidth = Math.max(maxWidth, this.getDisplayLength(line));
        }
      }

      const finalWidth = Math.max(maxWidth, 1);
      maxWidthCache.set(cacheKey, finalWidth);
      widths[col] = finalWidth;
    }
    return widths;
  }

  /**
   * Calculate optimal width for each column (legacy method)
   */
  calculateColumnWidths(columnCount) {
    return this.calculateColumnWidthsOptimized(columnCount);
  }

  /**
   * Optimized batched row rendering for wide tables (10+ columns)
   */
  renderRowsBatched(totalRows, columnWidths) {
    const lines = [];

    // Process rows in batches to reduce overhead
    const batchSize = Math.max(1, Math.min(10, Math.floor(100 / this.dimensions.columns)));

    for (let startRow = 1; startRow <= totalRows; startRow += batchSize) {
      const endRow = Math.min(startRow + batchSize - 1, totalRows);

      // Process this batch
      for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const rowLines = this.renderRowOptimized(rowNum, columnWidths);
        lines.push(...rowLines);
      }
    }

    return lines.join('\n');
  }

  /**
   * Optimized single row rendering with selective caching
   */
  renderRowOptimized(rowNum, columnWidths) {
    // Skip row-level caching for wide tables to reduce overhead
    const isWideTable = this.dimensions.columns >= 15;
    const rowCacheKey = isWideTable ? null : `row_${rowNum}`;

    if (rowCacheKey && this.rowCache.has(rowCacheKey)) {
      return this.rowCache.get(rowCacheKey);
    }

    const rowHeight = this.table.getRowHeight(rowNum);
    const lines = [];

    for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
      // Special handling for hierarchical headers
      if (rowNum > 1 && this.isHeaderRow(rowNum)) {
        const line = this.renderHierarchicalHeaderRow(rowNum, lineIndex, columnWidths);
        lines.push(line);
      } else {
        // Choose rendering path based on table width
        if (isWideTable) {
          // Fast path for wide tables - minimal overhead
          const lineParts = new Array(this.table.maxColumn + 1);
          for (let col = 0; col <= this.table.maxColumn; col++) {
            lineParts[col] = this.renderCellFast(col, rowNum, lineIndex, columnWidths);
          }
          const line = lineParts.join('  ').trimEnd();
          lines.push(' ' + line);
        } else {
          // Optimized path for normal tables with caching
          const lineParts = new Array(this.table.maxColumn + 1);
          for (let col = 0; col <= this.table.maxColumn; col++) {
            lineParts[col] = this.renderCellOptimized(col, rowNum, lineIndex, columnWidths);
          }
          const line = lineParts.join('  ').trimEnd();
          lines.push(' ' + line);
        }
      }
    }

    // Cache the result only for narrow tables
    if (rowCacheKey) {
      this.rowCache.set(rowCacheKey, lines);
    }
    return lines;
  }

  /**
   * Optimized cell rendering with selective caching
   */
  renderCellOptimized(col, rowNum, lineIndex, columnWidths) {
    // Skip cell caching for wide tables to reduce overhead
    const isWideTable = this.dimensions.columns >= 15;
    const cellCacheKey = isWideTable ? null : `cell_${col}_${rowNum}_${lineIndex}`;

    if (cellCacheKey && this.cellCache.has(cellCacheKey)) {
      return this.cellCache.get(cellCacheKey);
    }

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

    // Apply colors based on context and format (with caching)
    if (displayContent && displayContent.trim()) {
      displayContent = this.applyColorOptimized(displayContent, col, rowNum);
    }

    // Don't apply padding to the last column unless it's right-aligned
    const isLastColumn = col === this.table.maxColumn;
    const isRightAligned = format.align === 'right';
    const width = (isLastColumn && !isRightAligned) ? 0 : columnWidths[col];

    const formattedContent = this.formatCellContent(displayContent, width, format);

    // Cache the result only for narrow tables
    if (cellCacheKey) {
      this.cellCache.set(cellCacheKey, formattedContent);
    }
    return formattedContent;
  }

  /**
   * Fast cell rendering for wide tables (no caching, minimal overhead)
   */
  renderCellFast(col, rowNum, lineIndex, columnWidths) {
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

    // Apply colors based on context and format (simplified)
    if (displayContent && displayContent.trim()) {
      const colFormat = this.formatCache.get(col);

      // Apply yellow color to headers (rows 1-3)
      if (this.isHeaderRow(rowNum)) {
        displayContent = this.applyColor(displayContent, 'yellow');
      }
      // Apply column-specific color to data rows if specified in structure
      else if (colFormat && colFormat.color) {
        displayContent = this.applyColor(displayContent, colFormat.color);
      }
    }

    // Don't apply padding to the last column unless it's right-aligned
    const isLastColumn = col === this.table.maxColumn;
    const isRightAligned = format.align === 'right';
    const width = (isLastColumn && !isRightAligned) ? 0 : columnWidths[col];

    return this.formatCellContent(displayContent, width, format);
  }

  /**
   * Optimized color application with caching
   */
  applyColorOptimized(content, col, rowNum) {
    const colorCacheKey = `color_${content}_${col}_${rowNum}`;
    if (this.colorCache.has(colorCacheKey)) {
      return this.colorCache.get(colorCacheKey);
    }

    let result = content;
    const colFormat = this.formatCache.get(col);

    // Apply yellow color to headers (rows 1-3)
    if (this.isHeaderRow(rowNum)) {
      result = this.applyColor(content, 'yellow');
    }
    // Apply column-specific color to data rows if specified in structure
    else if (colFormat.color) {
      result = this.applyColor(content, colFormat.color);
    }

    this.colorCache.set(colorCacheKey, result);
    return result;
  }

  /**
   * Render a single row (legacy method - falls back to optimized version)
   */
  renderRow(rowNum, columnWidths) {
    return this.renderRowOptimized(rowNum, columnWidths);
  }

  /**
   * Original render method (kept for compatibility)
   */
  renderRowOriginal(rowNum, columnWidths) {
    const rowHeight = this.table.getRowHeight(rowNum);
    const lines = [];

    for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
      // Special handling for hierarchical headers
      if (rowNum > 1 && this.isHeaderRow(rowNum)) {
        const line = this.renderHierarchicalHeaderRow(rowNum, lineIndex, columnWidths);
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

    const cleanLength = this.getDisplayLength(content || '');
    const padding = Math.max(0, width - cleanLength);


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

      if (this.getDisplayLength(testLine) <= width) {
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
  renderHierarchicalHeaderRow(rowNum, lineIndex, columnWidths) {
    const lineParts = [];
    let currentPosition = 0;

    // Find the first non-empty cell in the specified row to determine the starting position
    let firstNonEmptyCol = -1;
    for (let col = 0; col <= this.table.maxColumn; col++) {
      const cellRef = this.table.getCellReference(col, rowNum);
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
  /**
   * Calculate the number of header rows based on hierarchical structure
   * This analyzes the table structure to determine where headers end and data begins
   */
  calculateHeaderRowCount() {
    if (!this.headerRowCount) {
      // Calculate header depth based on structure parameter
      const structureDepth = this.calculateStructureDepth(this.structure);
      this.headerRowCount = structureDepth;
    }

    return this.headerRowCount;
  }

  /**
   * Calculate the depth of nesting in the structure parameter
   * Examples:
   * - "name,age" = depth 1
   * - "name,address[city,state]" = depth 2
   * - "user[contact[email,address[city,state]]]" = depth 3
   */
  calculateStructureDepth(structure) {
    if (!structure || structure.trim() === '') {
      return 1; // Default to 1 header row for simple structures
    }

    let maxDepth = 1;
    let currentDepth = 1;

    // Count bracket nesting depth
    for (let i = 0; i < structure.length; i++) {
      const char = structure[i];
      if (char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ']') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  isHeaderRow(rowNum) {
    const headerRowCount = this.calculateHeaderRowCount();
    return rowNum <= headerRowCount;
  }

  /**
   * Remove ANSI color codes from text with caching for performance
   */
  removeAnsiCodes(text) {
    if (!text) return '';

    // Check cache first
    if (this.ansiCache.has(text)) {
      return this.ansiCache.get(text);
    }

    // Compute and cache result
    const cleaned = text.replace(/\x1b\[[0-9;]*m/g, '');
    this.ansiCache.set(text, cleaned);
    return cleaned;
  }

  /**
   * Get the display length of text (ANSI-stripped) with caching
   */
  getDisplayLength(text) {
    if (!text) return 0;

    // Check length cache first
    if (this.lengthCache.has(text)) {
      return this.lengthCache.get(text);
    }

    // Compute and cache length
    const length = this.removeAnsiCodes(text).length;
    this.lengthCache.set(text, length);
    return length;
  }
}