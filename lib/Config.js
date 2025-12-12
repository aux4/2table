/**
 * Config class - simplified for new architecture
 */
export class Config {
  constructor(structure) {
    this.structure = structure;
    // The new architecture handles width calculations in TableBuilder
    // This is just for compatibility
  }
}