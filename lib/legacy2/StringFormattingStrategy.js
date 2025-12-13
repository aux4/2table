/**
 * String formatting strategies using Strategy pattern
 * Ensures consistent string conversion for all value types
 */

export class StringFormattingStrategy {
  static getStrategy(value) {
    if (Array.isArray(value)) {
      return new ArrayStringFormatter();
    }
    if (value === null || value === undefined) {
      return new NullStringFormatter();
    }
    if (typeof value === 'object') {
      return new ObjectStringFormatter();
    }
    return new PrimitiveStringFormatter();
  }

  static format(value) {
    const strategy = this.getStrategy(value);
    return strategy.format(value);
  }

  static ensureString(value) {
    // For arrays, preserve them for multi-line cell content
    if (Array.isArray(value)) {
      const formatted = this.format(value);
      if (Array.isArray(formatted)) {
        return formatted; // Preserve arrays
      }
    }

    // Guarantee string output for padding operations
    const formatted = this.format(value);
    return typeof formatted === 'string' ? formatted : String(formatted);
  }
}

class NullStringFormatter {
  format(value) {
    return '';
  }
}

class PrimitiveStringFormatter {
  format(value) {
    return String(value);
  }
}

class ArrayStringFormatter {
  format(value) {
    // Preserve arrays for multi-line cell content - don't join with newlines
    if (Array.isArray(value)) {
      return value; // Let Cell handle the array directly
    }
    return String(value);
  }
}

class ObjectStringFormatter {
  format(value) {
    return '[object Object]';
  }
}