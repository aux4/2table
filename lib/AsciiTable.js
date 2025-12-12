import { Table } from './Table.js';
import { InvalidLineStrategy } from './InvalidLineStrategy.js';

/**
 * AsciiTable for compatibility with existing interface
 */
export class AsciiTable extends Table {
  constructor(data, structure, config, printHeaders = true, lineNumbers = false, invalidLines = [], wrapperData = null) {
    const showInvalidLines = invalidLines && invalidLines.length > 0;

    // Process data and structure through InvalidLineStrategy
    const processedData = InvalidLineStrategy.processData(data, invalidLines, showInvalidLines, lineNumbers, wrapperData);
    const processedStructure = InvalidLineStrategy.processStructure(structure, data, invalidLines, showInvalidLines, lineNumbers, wrapperData);

    super(processedData, processedStructure, config);
    this.printHeaders = printHeaders;
    this.lineNumbers = lineNumbers;
    this.invalidLines = invalidLines;
    this.wrapperData = wrapperData;
  }

  print() {
    return super.print();
  }
}