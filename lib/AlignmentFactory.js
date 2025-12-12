/**
 * Factory for creating alignment strategies
 * Eliminates the switch statement in AlignmentStrategy
 */

export class AlignmentFactory {
  static strategies = new Map([
    ['left', () => new LeftAlignmentStrategy()],
    ['right', () => new RightAlignmentStrategy()],
    ['center', () => new CenterAlignmentStrategy()]
  ]);

  static createStrategy(alignment) {
    const creator = this.strategies.get(alignment);
    return creator ? creator() : this.strategies.get('left')();
  }
}

class LeftAlignmentStrategy {
  align(text, width, isLastColumn, getDisplayLength) {
    if (isLastColumn) {
      return text; // No padding for left-aligned last column to avoid trailing spaces
    }
    const displayLength = getDisplayLength(text);
    return text.padEnd(width - displayLength + text.length);
  }
}

class RightAlignmentStrategy {
  align(text, width, isLastColumn, getDisplayLength) {
    const displayLength = getDisplayLength(text);
    // Right-align but avoid trailing spaces for last column
    return text.padStart(width - displayLength + text.length);
  }
}

class CenterAlignmentStrategy {
  align(text, width, isLastColumn, getDisplayLength) {
    const displayLength = getDisplayLength(text);
    const padding = width - displayLength;
    const leftPad = Math.floor(padding / 2);

    if (isLastColumn) {
      return text.padStart(leftPad + text.length);
    }
    return text.padStart(leftPad + text.length).padEnd(width - displayLength + text.length);
  }
}