/**
 * Width control system mimicking legacy approach
 * Tracks the maximum width seen across all data items
 */

export class WidthControl {
  constructor(fixedWidth = null) {
    this.internalValue = fixedWidth || 0;
    this.fixedWidth = fixedWidth;
  }

  add(value) {
    if (!this.fixedWidth && value > this.internalValue) {
      this.internalValue = value;
    }
  }

  value() {
    return this.internalValue;
  }
}