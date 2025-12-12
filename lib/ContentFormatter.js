/**
 * Content formatters handle different types of data structures.
 * Uses Strategy pattern to format content based on type and structure.
 */

import { ContentExtractor } from './ContentExtractor.js';

export class ContentFormatter {
  static getStrategy(content, structure) {
    if (Array.isArray(content)) {
      return structure ? new StructuredArrayFormatter() : new SimpleArrayFormatter();
    }

    if (structure && typeof content === 'object' && content !== null) {
      return new StructuredObjectFormatter();
    }

    return new PrimitiveFormatter();
  }

  static format(content, structure, width) {
    const strategy = this.getStrategy(content, structure);
    return strategy.format(content, structure, width);
  }
}

class PrimitiveFormatter {
  format(content, structure, width) {
    if (content === null || content === undefined) return '';
    if (typeof content === 'number') return String(content);
    if (typeof content === 'object') return '[object Object]';
    return String(content);
  }
}

class SimpleArrayFormatter {
  format(array, structure, width) {
    // Simple arrays like ["users", "posts", "comments"] -> join with commas
    return array.join(', ');
  }
}

class StructuredArrayFormatter {
  format(array, structure, width) {
    // Structured arrays like logs: [{"level": "info", "message": "..."}]
    // Each array item becomes a line
    return array.map(item => {
      const parts = structure.map(field => {
        const value = ContentExtractor.extract(item, field.field || field.key, structure);
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return '[object Object]';
        return String(value);
      });
      return parts.join('  ').trim();
    });
  }
}

class StructuredObjectFormatter {
  format(obj, structure, width) {
    // Objects with nested structure like data: {logs: [...], metrics: {...}}
    const parts = structure.map(field => {
      const value = ContentExtractor.extract(obj, field.field || field.key, structure);
      if (value === null || value === undefined) return '';

      if (Array.isArray(value) && field.group) {
        // Nested array with structure
        const formatter = new StructuredArrayFormatter();
        const lines = formatter.format(value, field.group, width);
        return Array.isArray(lines) ? lines.join('\n') : lines;
      } else if (typeof value === 'object' && value !== null && field.group) {
        // Nested object with structure
        return this.format(value, field.group, width);
      } else if (typeof value === 'object') {
        return '[object Object]';
      }

      return String(value);
    });

    // For objects with multiple structured fields, arrange them properly
    return parts.join('  ').trim();
  }
}