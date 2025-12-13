/**
 * Alignment strategies using Strategy pattern
 * Eliminates switch statements in Cell class
 */

import { AlignmentFactory } from './AlignmentFactory.js';

export class AlignmentStrategy {
  static align(text, width, alignment, isLastColumn, getDisplayLength) {
    const strategy = AlignmentFactory.createStrategy(alignment);
    return strategy.align(text, width, isLastColumn, getDisplayLength);
  }
}