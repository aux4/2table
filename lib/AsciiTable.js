import { Table } from './Table.js';

/**
 * AsciiTable for compatibility with existing interface
 */
export class AsciiTable extends Table {
  constructor(data, structure, config, printHeaders = true, lineNumbers = false, invalidLines = [], wrapperData = null) {
    super(data, structure, config);
    this.printHeaders = printHeaders;
    this.lineNumbers = lineNumbers;
    this.invalidLines = invalidLines;
    this.wrapperData = wrapperData;
  }

  print() {
    // For now, ignoring the additional parameters (lineNumbers, invalidLines, etc.)
    // Focus on core functionality first
    return super.print();
  }
}