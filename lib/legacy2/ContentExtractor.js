/**
 * Content extraction strategies using Strategy pattern
 * Handles different types of field access patterns
 */

export class ContentExtractor {
  static getStrategy(field, obj = null, structure = null) {
    // Check if this is an invalid line first
    if (obj && obj.__isInvalidLine__) {
      return new InvalidLineExtractor(structure);
    }
    if (field.includes('.')) {
      return new DotNotationExtractor();
    }
    return new DirectExtractor();
  }

  static extract(obj, field, structure = null) {
    const strategy = this.getStrategy(field, obj, structure);
    return strategy.extract(obj, field);
  }
}

class DirectExtractor {
  extract(obj, field) {
    return obj[field];
  }
}

class DotNotationExtractor {
  extract(obj, path) {
    if (!path || !obj) return obj;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) return undefined;
      result = result[key];
    }

    return result;
  }
}

class InvalidLineExtractor {
  constructor(structure = null) {
    this.structure = structure;
  }

  extract(obj, field) {
    // For invalid lines, return line number if it's the line number field
    if (field === '__lineNumber__') {
      return obj.__lineNumber__;
    }

    // Determine if this is the first non-line-number field
    if (this.structure && this.isFirstDataField(field)) {
      return '<invalid line>';
    }

    // For subsequent fields, return null/empty
    return null;
  }

  isFirstDataField(field) {
    if (!this.structure) return true; // Default to first field if no structure

    // Find the first field that's not a line number field
    for (const structField of this.structure) {
      if (structField.key !== '__lineNumber__') {
        return structField.key === field || structField.field === field;
      }
    }
    return false;
  }
}