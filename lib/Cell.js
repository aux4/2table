import { AlignmentStrategy } from './AlignmentStrategy.js';

/**
 * Cell represents a single table cell that can contain multiple lines of content.
 * Arrays are naturally rendered as multi-line content within the cell.
 */
export class Cell {
  constructor(content, width, alignment = 'left', isLastColumn = false) {
    this.width = width;
    this.alignment = alignment;
    this.isLastColumn = isLastColumn;
    this.lines = this.formatContent(content, width);
  }

  formatContent(content, width) {
    if (content === null || content === undefined) {
      return [''];
    }

    if (Array.isArray(content)) {
      // Arrays become multiple lines within the same cell
      return content.map(item => this.formatItem(item, width, this.isLastColumn));
    }

    // Single content - check if it needs wrapping
    const text = String(content);
    if (this.getDisplayLength(text) > width) {
      // Text exceeds width - wrap to multiple lines
      const wrappedLines = this.wrapText(text, width);
      return wrappedLines.map(line => this.formatItem(line, width, this.isLastColumn));
    }

    return [this.formatItem(content, width, this.isLastColumn)];
  }

  formatItem(item, width, isLastColumn = false) {
    const text = String(item);
    return AlignmentStrategy.align(text, width, this.alignment, isLastColumn, this.getDisplayLength.bind(this));
  }

  getDisplayLength(text) {
    if (typeof text !== 'string') return 0;
    // Remove ANSI escape sequences for accurate length calculation
    return text.replace(/\u001b\[[0-9;]*m/g, '').length;
  }

  wrapText(text, width) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let word of words) {
      // Check if adding this word would exceed the width
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (this.getDisplayLength(testLine) <= width) {
        currentLine = testLine;
      } else {
        // If current line has content, save it and start new line
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is too long - break it
          lines.push(...this.breakLongWord(word, width));
          currentLine = '';
        }
      }
    }

    // Add the last line if it has content
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  breakLongWord(word, width) {
    const lines = [];
    let remaining = word;

    while (this.getDisplayLength(remaining) > width) {
      // Find the longest substring that fits
      let chunk = '';
      for (let i = 1; i <= remaining.length; i++) {
        const candidate = remaining.substring(0, i);
        if (this.getDisplayLength(candidate) <= width) {
          chunk = candidate;
        } else {
          break;
        }
      }

      if (chunk) {
        lines.push(chunk);
        remaining = remaining.substring(chunk.length);
      } else {
        // Even single character doesn't fit - force it
        lines.push(remaining.charAt(0));
        remaining = remaining.substring(1);
      }
    }

    if (remaining) {
      lines.push(remaining);
    }

    return lines;
  }

  getHeight() {
    return this.lines.length;
  }

  getLine(lineIndex) {
    if (lineIndex < this.lines.length) {
      return this.lines[lineIndex];
    }
    return this.getEmptyLine();
  }

  getEmptyLine() {
    if (this.isLastColumn) {
      return '';
    }
    return ''.padEnd(this.width);
  }

  getAllLines() {
    return this.lines;
  }
}