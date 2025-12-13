/**
 * TableRow represents a single table row composed of multiple cells.
 * Automatically handles multi-line cells by calculating the maximum height.
 */
export class TableRow {
  constructor(cells) {
    this.cells = cells;
    this.height = Math.max(...cells.map(cell => cell.getHeight()), 1);
  }

  render() {
    const lines = [];

    for (let lineIndex = 0; lineIndex < this.height; lineIndex++) {
      // Get content for each cell on this line
      const cellContents = this.cells.map(cell => cell.getLine(lineIndex));


      // Check which cells have content on this line to avoid unnecessary padding
      const hasContentLater = (cellIndex) => {
        for (let i = cellIndex + 1; i < cellContents.length; i++) {
          if (cellContents[i].trim() !== '') {
            return true;
          }
        }
        return false;
      };

      // Build the row line with smart padding
      let rowLine = '';
      for (let cellIndex = 0; cellIndex < cellContents.length; cellIndex++) {
        const cellContent = cellContents[cellIndex];
        const isLastColumn = cellIndex === cellContents.length - 1;

        if (isLastColumn) {
          // Last column - no trailing spaces needed
          rowLine += cellContent;
        } else {
          // Non-last column - only pad if there's content OR later cells have content
          if (cellContent.trim() !== '' || hasContentLater(cellIndex)) {
            rowLine += cellContent + '  ';
          }
        }
      }

      lines.push(' ' + rowLine.trimEnd()); // Add leading space and trim trailing
    }

    return lines.join('\n');
  }

  getHeight() {
    return this.height;
  }

  getCells() {
    return this.cells;
  }
}