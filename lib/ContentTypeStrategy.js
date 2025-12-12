/**
 * Content type detection and handling strategies
 * Eliminates typeof checks throughout the codebase
 */

export class ContentTypeStrategy {
  static getStrategy(content) {
    if (content === null || content === undefined) {
      return new NullContentStrategy();
    }
    if (typeof content === 'number') {
      return new NumericContentStrategy();
    }
    if (Array.isArray(content)) {
      return new ArrayContentStrategy();
    }
    if (typeof content === 'object') {
      return new ObjectContentStrategy();
    }
    return new StringContentStrategy();
  }

  static isObject(content) {
    return content !== null && content !== undefined && typeof content === 'object' && !Array.isArray(content);
  }

  static isNumber(content) {
    return typeof content === 'number';
  }

  static isArray(content) {
    return Array.isArray(content);
  }

  static handle(content, context = {}) {
    const strategy = this.getStrategy(content);
    return strategy.handle(content, context);
  }

  static getAlignment(content) {
    const strategy = this.getStrategy(content);
    return strategy.getAlignment();
  }

  static measureWidth(content) {
    const strategy = this.getStrategy(content);
    return strategy.measureWidth(content);
  }
}

class NullContentStrategy {
  handle(content, context) {
    return '';
  }

  getAlignment() {
    return 'left';
  }

  measureWidth(content) {
    return 0;
  }
}

class NumericContentStrategy {
  handle(content, context) {
    return String(content);
  }

  getAlignment() {
    return 'right';
  }

  measureWidth(content) {
    return String(content).length;
  }
}

class StringContentStrategy {
  handle(content, context) {
    return String(content);
  }

  getAlignment() {
    return 'left';
  }

  measureWidth(content) {
    if (typeof content !== 'string') return 0;
    const str = String(content);
    // Remove ANSI escape sequences for accurate length calculation
    return str.replace(/\u001b\[[0-9;]*m/g, '').length;
  }
}

class ArrayContentStrategy {
  handle(content, context) {
    // Arrays are handled as multi-line content
    return content;
  }

  getAlignment() {
    return 'left';
  }

  measureWidth(content) {
    if (!Array.isArray(content)) return 0;
    // For arrays, measure the longest item
    return Math.max(...content.map(item => {
      const strategy = ContentTypeStrategy.getStrategy(item);
      return strategy.measureWidth(item);
    }));
  }
}

class ObjectContentStrategy {
  handle(content, context) {
    // Objects need special handling based on context
    if (context.field && context.field.group) {
      // Will be handled by DataFormatter
      return content;
    }
    return '[object Object]';
  }

  getAlignment() {
    return 'left';
  }

  measureWidth(content) {
    return '[object Object]'.length;
  }
}