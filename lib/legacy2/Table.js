import { TableBuilder } from './TableBuilder.js';
import { parseStructure } from './Structure.js';

/**
 * Table class for compatibility with existing interface
 */
export class Table {
  constructor(data, structure, config) {
    this.data = data;
    this.structure = structure;
    this.config = config;

    // Parse structure if it's a string
    const parsedStructure = typeof structure === 'string' ? parseStructure(structure) : structure;

    // Build the actual table using new architecture
    this.tableBuilder = new TableBuilder(data, parsedStructure);
    this.builtTable = this.tableBuilder.build();
  }

  print() {
    return this.builtTable.render();
  }
}