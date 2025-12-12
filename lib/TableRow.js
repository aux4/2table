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
      const rowLine = this.cells
        .map(cell => cell.getLine(lineIndex))
        .join('  '); // Join cells with 2 spaces

      lines.push(' ' + rowLine); // Add leading space
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