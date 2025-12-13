/**
 * Bridge between legacy table logic and new Excel-like cell system
 * This allows us to reuse the working legacy logic while transitioning to the new architecture
 */
export class LegacyBridge {
  /**
   * Convert legacy table output to Excel-like cell mapping
   */
  static convertLegacyToExcel(legacyOutput, table) {
    if (!legacyOutput || legacyOutput.trim() === '') {
      return;
    }

    const lines = legacyOutput.split('\n');

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
      const line = lines[rowIndex];
      if (line.trim() === '') continue;

      // Parse the line into columns (split by multiple spaces)
      const columns = this.parseLineColumns(line);

      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const cellRef = table.getCellReference(colIndex, rowIndex + 1);
        table.setCell(cellRef, columns[colIndex]);
      }
    }
  }

  /**
   * Parse a line into columns by splitting on multiple spaces
   */
  static parseLineColumns(line) {
    // Split by 2+ spaces, but preserve single spaces within content
    const parts = line.split(/\s{2,}/);
    const columns = [];

    for (let part of parts) {
      part = part.trim();
      if (part !== '') {
        columns.push(part);
      }
    }

    return columns;
  }

  /**
   * Create legacy table instance and get output
   */
  static async createLegacyTable(data, structure, config, format, lineNumbers = false, invalidLines = [], wrapperData = null) {
    // Import legacy classes
    const { AsciiTable } = await import('./legacy2/AsciiTable.js');
    const { parseStructure } = await import('./legacy2/Structure.js');
    const { prepareData } = await import('./legacy2/Data.js');
    const { Config } = await import('./legacy2/Config.js');

    try {
      // Parse structure and prepare data using legacy logic
      const tableStructure = parseStructure(structure);
      const tableConfig = new Config(tableStructure);
      const preparedData = prepareData(data, tableStructure, tableConfig);

      // Create legacy table
      const legacyTable = new AsciiTable(preparedData, tableStructure, tableConfig, true, lineNumbers, invalidLines, wrapperData);

      return legacyTable.print();
    } catch (e) {
      console.error('Legacy bridge error:', e.message);
      throw e;
    }
  }
}