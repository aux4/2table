/**
 * Content extraction strategies using Strategy pattern
 * Handles different types of field access patterns
 */

export class ContentExtractor {
  static getStrategy(field) {
    if (field.includes('.')) {
      return new DotNotationExtractor();
    }
    return new DirectExtractor();
  }

  static extract(obj, field) {
    const strategy = this.getStrategy(field);
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