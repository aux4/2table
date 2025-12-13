import { AsciiTable } from './AsciiTable.js';
import { HeaderStrategy } from './HeaderStrategy.js';

/**
 * MarkdownTable outputs tables in markdown format
 */
export class MarkdownTable extends AsciiTable {
  print() {
    // Use the parent's built table but render it as markdown instead of ASCII
    const builtTable = this.builtTable;
    const rows = builtTable.rows;

    if (!rows || rows.length === 0) {
      return '';
    }

    const lines = [];
    const totalColumns = this.calculateTotalColumns();

    // Process each row
    rows.forEach((row, rowIndex) => {
      const cells = row.getCells();
      const rowHeight = row.getHeight();

      // Process each line within the row
      for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
        const lineContents = this.extractLineFromCells(cells, lineIndex, totalColumns, rowIndex);

        // Check if this line has any content
        const hasContent = lineContents.some(content => content !== '');

        if (hasContent) {
          const markdownLine = '| ' + lineContents.join(' | ') + ' |';
          lines.push(markdownLine);
        }

        // Add separator line after the first header line (not after all header rows)
        if (rowIndex === 0 && lineIndex === 0) {
          const separatorCells = new Array(totalColumns).fill('---');
          const separatorLine = '| ' + separatorCells.join(' | ') + ' |';
          lines.push(separatorLine);
        }
      }
    });

    return lines.join('\n');
  }

  // Extract content from cells for a specific line, expanding grouped cells to individual columns
  extractLineFromCells(cells, lineIndex, totalColumns, rowIndex) {
    const lineContents = [];

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
      const cell = cells[cellIndex];
      const structure = this.tableBuilder.structure;
      const field = structure[cellIndex];

      const cellContent = cell.getLine(lineIndex);
      const cleanContent = this.cleanContent(cellContent);

      if (field && field.group) {
        // This cell represents multiple columns
        if (rowIndex === 0 && lineIndex === 0) {
          // First line of first row (main header) - don't split
          lineContents.push(cleanContent);
          for (let i = 1; i < field.group.length; i++) {
            lineContents.push('');
          }
        } else if (rowIndex === 0 && cleanContent !== '') {
          // Subsequent header lines - split by multiple spaces or fallback
          const expandedColumns = this.expandGroupedCellContent(cleanContent, field);
          lineContents.push(...expandedColumns);
        } else if (cleanContent === '') {
          // Empty content - fill with empty strings
          for (let i = 0; i < field.group.length; i++) {
            lineContents.push('');
          }
        } else {
          // Data rows - split the content
          const expandedColumns = this.expandGroupedCellContent(cleanContent, field);
          lineContents.push(...expandedColumns);
        }
      } else {
        // Simple cell - single column
        lineContents.push(cleanContent);
      }
    }

    // Ensure we have exactly the right number of columns
    while (lineContents.length < totalColumns) {
      lineContents.push('');
    }
    lineContents.splice(totalColumns);

    return lineContents;
  }

  // Clean ANSI color codes and trim content
  cleanContent(content) {
    if (!content) return '';
    return content.replace(/\u001b\[[0-9;]*m/g, '').trim();
  }

  // Check if content looks like a header (contains quotes or looks like a label)
  isHeaderContent(content) {
    if (!content) return true;
    // Check if content is surrounded by quotes (indicating it's a custom header name)
    if (content.startsWith('"') && content.endsWith('"')) return true;
    // Check if content looks like a field name (no spaces or special formatting that suggests data)
    if (content.length < 50 && !/\s{2,}/.test(content) && !content.includes('@')) return true;
    return false;
  }

  // Expand grouped cell content into individual columns
  expandGroupedCellContent(content, field) {
    if (!content || content === '') {
      return new Array(field.group.length).fill('');
    }

    // Try to split by multiple spaces first (works for most cases)
    let parts = content.split(/\s{2,}/).filter(part => part !== '');

    // If we don't have enough parts, try single space splitting and smart grouping
    if (parts.length < field.group.length) {
      const words = content.split(/\s+/).filter(word => word !== '');

      if (words.length <= field.group.length) {
        // Each word gets its own column
        parts = words;
      } else {
        // Smart grouping: distribute words across columns
        parts = this.distributeWordsToColumns(words, field.group.length);
      }
    }

    // Ensure we have the right number of parts
    const result = new Array(field.group.length).fill('');
    for (let i = 0; i < Math.min(parts.length, field.group.length); i++) {
      result[i] = parts[i];
    }

    return result;
  }

  // Distribute words intelligently across columns
  distributeWordsToColumns(words, columnCount) {
    const result = [];
    let currentColumn = [];
    let wordIndex = 0;

    while (wordIndex < words.length && result.length < columnCount) {
      const remainingWords = words.length - wordIndex;
      const remainingColumns = columnCount - result.length;

      // If we have more columns remaining than words, put one word per column
      if (remainingWords <= remainingColumns) {
        if (currentColumn.length > 0) {
          result.push(currentColumn.join(' '));
          currentColumn = [];
        }
        result.push(words[wordIndex]);
        wordIndex++;
      } else {
        // Collect multiple words for this column
        const wordsForThisColumn = Math.ceil(remainingWords / remainingColumns);
        for (let i = 0; i < wordsForThisColumn && wordIndex < words.length; i++) {
          currentColumn.push(words[wordIndex]);
          wordIndex++;
        }
        result.push(currentColumn.join(' '));
        currentColumn = [];
      }
    }

    return result;
  }

  // Calculate total number of columns by analyzing the table structure
  calculateTotalColumns() {
    // Get the structure from the table builder
    const structure = this.tableBuilder.structure;
    return this.countColumnsInStructure(structure);
  }

  // Count total leaf columns in the structure
  countColumnsInStructure(structure) {
    let count = 0;
    for (const field of structure) {
      if (field.group) {
        count += this.countColumnsInStructure(field.group);
      } else {
        count += 1;
      }
    }
    return count;
  }
}