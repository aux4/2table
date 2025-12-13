import { Cell } from './Cell.js';
import { TableRow } from './TableRow.js';
import { ContentFormatter } from './ContentFormatter.js';
import { ContentExtractor } from './ContentExtractor.js';
import { HeaderStrategy } from './HeaderStrategy.js';
import { DataFormatter } from './DataFormatter.js';
import { WidthControl } from './WidthControl.js';
import { ContentTypeStrategy } from './ContentTypeStrategy.js';
import { InvalidRowStrategy } from './InvalidRowStrategy.js';

/**
 * TableBuilder constructs tables using the new cell-centric approach.
 * Arrays are treated as multi-line content within cells, not separate rows.
 */
export class TableBuilder {
  constructor(data, structure) {
    this.data = Array.isArray(data) ? data : [data];
    this.structure = structure;
    this.columnWidths = this.calculateColumnWidths();
  }

  build() {
    const headerRow = this.buildHeaderRow();
    const dataRows = this.data.map(item => this.buildDataRow(item));

    // Return a simple table object instead of importing Table
    return {
      rows: [headerRow, ...dataRows],
      structure: this.structure,
      header: headerRow,
      dataRows: dataRows,
      render: () => this.renderRows([headerRow, ...dataRows])
    };
  }

  renderRows(rows) {
    const output = [];

    rows.forEach(row => {
      const renderedRow = row.render();
      output.push(renderedRow);
    });

    return output.join('\n');
  }

  buildHeaderRow() {
    const headerCells = this.structure.map((field, index) => {
      const isLastColumn = index === this.structure.length - 1;
      return this.buildHeaderCell(field, isLastColumn);
    });

    return new TableRow(headerCells);
  }

  buildHeaderCell(field, isLastColumn = false) {
    const width = this.columnWidths[field.key];
    return HeaderStrategy.createHeader(field, width, isLastColumn, this.columnWidths);
  }

  buildDataRow(item) {
    // Check if this is an invalid line row
    if (item.__isInvalidLine__) {
      return InvalidRowStrategy.createRow(item, this.structure, this.columnWidths, true);
    }

    const dataCells = this.structure.map((field, index) => {
      const content = ContentExtractor.extract(item, field.field || field.key, this.structure);
      const width = this.columnWidths[field.key];
      const isLastColumn = index === this.structure.length - 1;

      // Calculate column position for left padding
      const columnPosition = this.calculateColumnPosition(index);

      return this.createCell(content, field, width, isLastColumn, columnPosition);
    });

    return new TableRow(dataCells);
  }

  createCell(content, fieldDef, width, isLastColumn = false, columnPosition = 0) {
    if (fieldDef.group) {
      // Field has nested structure - use DataFormatter with column width access
      // Don't pass columnPosition for top-level fields - let TableRow handle positioning
      const formattedContent = DataFormatter.format(content, fieldDef, this.columnWidths, 0);


      const alignment = this.getAlignment(content, fieldDef);
      return new Cell(formattedContent, width, alignment, isLastColumn);
    }

    // Simple field
    const formattedContent = ContentFormatter.format(content, null, width);
    const alignment = this.getAlignment(content, fieldDef);
    return new Cell(formattedContent, width, alignment, isLastColumn);
  }

  calculateColumnPosition(columnIndex) {
    // Calculate the total character width of all columns before this one
    // Including their content width + 2 spaces separator between columns + 1 leading space
    let totalWidth = 1; // Start with 1 for the leading space

    for (let i = 0; i < columnIndex; i++) {
      const field = this.structure[i];
      totalWidth += this.columnWidths[field.key] + 2; // column width + 2 separator spaces
    }

    return totalWidth;
  }

  getAlignment(content, field = null) {
    // Line numbers should be right-aligned regardless of content type
    if (field && field.key === '__lineNumber__') {
      return 'right';
    }
    return ContentTypeStrategy.getAlignment(content);
  }

  calculateColumnWidths() {
    const widthControls = {};

    // Initialize width controls with header lengths
    this.initializeWidthControls(widthControls);

    // Process each data item to find maximum widths
    this.data.forEach(item => {
      this.processDataItemWidths(item, widthControls);
    });

    // Convert controls to final width values
    const widths = {};
    this.extractFinalWidths(widthControls, widths);

    return widths;
  }

  initializeWidthControls(widthControls) {
    this.structure.forEach(field => {
      this.initializeFieldControls(field, widthControls);
    });
  }

  initializeFieldControls(field, widthControls) {
    // Handle line number column specially
    if (field.key === '__lineNumber__') {
      // Calculate line number width based on data length
      const maxLineNumber = this.data.length;
      const lineNumberWidth = Math.max(1, String(maxLineNumber).length);
      widthControls[field.key] = new WidthControl(lineNumberWidth);
      return;
    }

    // Initialize control with fixed width if specified, otherwise use header length
    const fixedWidth = field.properties?.width;
    widthControls[field.key] = new WidthControl(fixedWidth);

    if (!fixedWidth) {
      widthControls[field.key].add((field.label || field.key).length);
    }

    if (field.group) {
      field.group.forEach(subField => {
        this.initializeFieldControls(subField, widthControls);
      });
    }
  }

  processDataItemWidths(item, widthControls) {
    this.structure.forEach(field => {
      this.processFieldWidth(field, item, widthControls);
    });
  }

  processFieldWidth(field, item, widthControls) {
    const content = ContentExtractor.extract(item, field.field || field.key, this.structure);

    if (field.group && content) {
      if (Array.isArray(content)) {
        // Array of objects - process each item and find max width
        content.forEach(arrayItem => {
          field.group.forEach(subField => {
            this.processFieldWidth(subField, arrayItem, widthControls);
          });
        });
      } else if (typeof content === 'object') {
        // Single nested object
        field.group.forEach(subField => {
          this.processFieldWidth(subField, content, widthControls);
        });
      }

      // Calculate total width for parent as sum of sub-widths + spacing
      // This is done after processing all data items in extractFinalWidths
    } else {
      // Simple field - measure actual content width
      const actualWidth = this.measureActualContentWidth(content);
      widthControls[field.key].add(actualWidth);
    }
  }

  extractFinalWidths(widthControls, widths) {
    this.structure.forEach(field => {
      this.extractFieldWidth(field, widthControls, widths);
    });
  }

  extractFieldWidth(field, widthControls, widths) {
    if (field.group) {
      // Extract sub-field widths first
      field.group.forEach(subField => {
        this.extractFieldWidth(subField, widthControls, widths);
      });

      // Calculate parent width as sum of sub-widths + spacing
      let totalSubWidth = 0;
      field.group.forEach((subField, index) => {
        totalSubWidth += widths[subField.key];
        if (index < field.group.length - 1) {
          totalSubWidth += 2; // 2 spaces between columns
        }
      });

      // Parent width is max of its control value and calculated sub-total
      widths[field.key] = Math.max(widthControls[field.key].value(), totalSubWidth);
    } else {
      widths[field.key] = widthControls[field.key].value();
    }
  }

  measureActualContentWidth(content) {
    return ContentTypeStrategy.measureWidth(content);
  }

  calculateFieldWidthRecursive(field, widths) {
    if (field.group) {
      // First calculate widths for all sub-fields
      field.group.forEach(subField => {
        this.calculateFieldWidthRecursive(subField, widths);
      });

      // Then calculate parent width as sum of sub-field widths + spacing
      let totalSubWidth = 0;
      field.group.forEach((subField, index) => {
        // Start with minimum of header width for sub-fields
        const subHeaderWidth = (subField.label || subField.key).length;
        totalSubWidth += Math.max(widths[subField.key] || 0, subHeaderWidth);
        if (index < field.group.length - 1) {
          totalSubWidth += 2; // 2 spaces between columns
        }
      });

      // Parent width is max of header width and sub-columns total width
      const headerWidth = (field.label || field.key).length;
      widths[field.key] = Math.max(headerWidth, totalSubWidth);
    } else {
      // Simple field - start with header width as minimum
      widths[field.key] = (field.label || field.key).length;
    }
  }

  updateFieldWidthFromData(field, item, widths) {
    if (field.group) {
      // Extract the nested data for this field
      const nestedData = ContentExtractor.extract(item, field.field || field.key);

      // Update sub-field widths first using the nested data
      field.group.forEach(subField => {
        this.updateFieldWidthFromData(subField, nestedData, widths);
      });

      // Recalculate parent width based on updated sub-field widths
      let totalSubWidth = 0;
      field.group.forEach((subField, index) => {
        totalSubWidth += widths[subField.key];
        if (index < field.group.length - 1) {
          totalSubWidth += 2; // 2 spaces between columns
        }
      });

      widths[field.key] = Math.max(widths[field.key], totalSubWidth);
    } else {
      // Simple field - check actual data width
      const content = ContentExtractor.extract(item, field.field || field.key);
      const actualWidth = this.measureContentWidth(content, field);
      widths[field.key] = Math.max(widths[field.key], actualWidth);
    }
  }

  calculateFieldWidth(field) {
    const labelWidth = (field.label || field.key).length;

    if (field.group) {
      // For grouped fields, consider sub-labels
      const subWidths = field.group.map(sub => (sub.label || sub.key).length);
      const totalSubWidth = subWidths.reduce((a, b) => a + b, 0) + (subWidths.length - 1) * 2; // 2 spaces between
      return Math.max(labelWidth, totalSubWidth);
    }

    return labelWidth;
  }

  measureContentWidth(content, field) {
    if (content === null || content === undefined) return 0;

    if (Array.isArray(content)) {
      if (field.group) {
        // Structured array - measure each formatted line
        const formatted = ContentFormatter.format(content, field.group, 999);
        if (Array.isArray(formatted)) {
          return Math.max(...formatted.map(line => this.getDisplayLength(line)));
        }
        return this.getDisplayLength(formatted);
      } else {
        // Simple array
        return this.getDisplayLength(content.join(', '));
      }
    }

    if (field.group && typeof content === 'object' && content !== null) {
      // Structured object
      const formatted = ContentFormatter.format(content, field.group, 999);
      return this.getDisplayLength(formatted);
    }

    return this.getDisplayLength(String(content));
  }

  getDisplayLength(text) {
    if (typeof text !== 'string') return 0;
    // Remove ANSI escape sequences for accurate length calculation
    return text.replace(/\u001b\[[0-9;]*m/g, '').length;
  }
}