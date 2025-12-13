/**
 * Markdown Renderer - Dumb renderer that just reads Table cells and outputs Markdown format
 * Contains no JSON parsing logic - just renders cell contents as markdown table
 * Ignores colors and width formatting as requested
 */
export class MarkdownRenderer {
  constructor(table) {
    this.table = table;
  }

  /**
   * Render the table as Markdown format
   */
  print() {
    if (this.table.getDimensions().totalCells === 0) {
      return '';
    }

    const lines = [];
    const { columns, rows } = this.table.getDimensions();

    // Render each row
    for (let rowNum = 1; rowNum <= rows; rowNum++) {
      const rowLines = this.renderRow(rowNum, columns);
      lines.push(...rowLines);

      // Add separator after first row (header separator)
      if (rowNum === 1) {
        const separator = this.createHeaderSeparator(columns);
        lines.push(separator);
      }
    }

    return lines.join('\n');
  }

  /**
   * Create header separator line (| --- | --- | --- |)
   */
  createHeaderSeparator(columnCount) {
    const separators = new Array(columnCount).fill('---');
    return '| ' + separators.join(' | ') + ' |';
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