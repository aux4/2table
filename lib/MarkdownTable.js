import { AsciiTable } from './AsciiTable.js';

/**
 * MarkdownTable outputs tables in markdown format
 */
export class MarkdownTable extends AsciiTable {
  print() {
    // Get the built table from the parent
    const table = this.builtTable;
    const rows = table.rows;

    if (rows.length === 0) {
      return '';
    }

    const lines = [];

    // First, determine the total number of columns by analyzing the structure
    const totalColumns = this.calculateTotalColumns();

    // Process each table row
    rows.forEach((row, rowIndex) => {
      const cells = row.getCells();
      const rowHeight = row.getHeight();

      // Process each line within the row
      for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
        const expandedCellContents = this.expandCellsToColumns(cells, lineIndex);

        // Check if this line has any content
        const hasContent = expandedCellContents.some(content => content !== '');

        if (hasContent) {
          // Ensure we have exactly the right number of columns
          while (expandedCellContents.length < totalColumns) {
            expandedCellContents.push('');
          }
          expandedCellContents.splice(totalColumns); // Trim to exact count

          const markdownLine = '| ' + expandedCellContents.join(' | ') + ' |';
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

  // Expand cells to individual columns based on structure
  expandCellsToColumns(cells, lineIndex) {
    const expanded = [];
    const structure = this.tableBuilder.structure;

    for (let i = 0; i < cells.length && i < structure.length; i++) {
      const cell = cells[i];
      const field = structure[i];
      const content = cell.getLine(lineIndex).trim();
      const cleanContent = content.replace(/\u001b\[[0-9;]*m/g, '');

      if (field.group) {
        // This is a grouped field - split content into individual columns
        const subColumns = this.splitGroupedContent(cleanContent, field);
        expanded.push(...subColumns);
      } else {
        // Simple field - single column
        expanded.push(cleanContent);
      }
    }

    return expanded;
  }

  // Split grouped content into individual sub-columns
  splitGroupedContent(content, field) {
    if (!content || content === '') {
      // Return empty strings for all sub-fields
      return new Array(field.group.length).fill('');
    }

    // For now, split by multiple spaces (this is a simplification)
    // In a more robust implementation, we would need to parse based on column positions
    const parts = content.split(/\s{2,}/).filter(part => part !== '');

    // Ensure we have the right number of parts
    const result = new Array(field.group.length).fill('');
    for (let i = 0; i < Math.min(parts.length, field.group.length); i++) {
      result[i] = parts[i];
    }

    return result;
  }
}