/**
 * Pure parser that converts JSON + structure into populated Table cells
 * This is where all the intelligence lives - renderers are just dumb cell readers
 * Direct implementation without legacy dependencies for optimal performance
 */
export class TableParser {
  /**
   * Parse JSON data using structure and populate the Table with cells
   */
  static async parseIntoTable(table, data, structure, lineNumbers = false, invalidLines = [], wrapperData = null) {
    // Clear any existing data
    table.clear();

    // Use direct structure-based approach - no fallback to legacy
    await this.populateTableDirectly(table, data, structure, lineNumbers, invalidLines, wrapperData);
  }





  /**
   * Parse structure string into parsed structure object
   */
  static async parseStructureLocal(structure) {
    // For now, use the existing structure parsing from StructureParser
    const { StructureParser } = await import('./StructureParser.js');
    return StructureParser.parseStructure(structure);
  }

  /**
   * OPTIMIZED: Populate table cells directly from JSON without ASCII conversion
   * Implements proper hierarchical structure mapping:
   * - Level 1 fields go to Row 1
   * - Level 2 fields go to Row 2, starting at their parent's column
   * - Data starts after all header rows
   */
  static async populateTableDirectly(table, data, structure, lineNumbers = false, invalidLines = [], wrapperData = null) {
    // Parse the structure string into our hierarchical format
    const hierarchicalStructure = await this.parseHierarchicalStructure(structure);

    // Map field paths to column positions (accounting for line numbers)
    const fieldColumnMap = this.buildFieldColumnMap(hierarchicalStructure, lineNumbers);

    // Handle invalid lines by adjusting column widths if needed
    if (invalidLines.length > 0) {
      this.adjustColumnWidthsForInvalidLines(table, fieldColumnMap);
    }

    // Add line number header if needed
    if (lineNumbers) {
      const lineNumCellRef = table.getCellReference(0, 1); // Column 0, Row 1 (header row)
      table.setCell(lineNumCellRef, '#');

      // Set right alignment for line number column (numeric data)
      const lineNumColRef = table.numberToColumn(0);
      table.setFormat(lineNumColRef, { align: 'right' });
    }

    // Populate headers based on hierarchical structure
    this.populateHierarchicalHeaders(table, hierarchicalStructure, fieldColumnMap, lineNumbers);

    // Populate data rows (including invalid lines if showInvalidLines is true)
    const headerRowCount = this.calculateHeaderRowCount(hierarchicalStructure);
    this.populateHierarchicalData(table, data, fieldColumnMap, headerRowCount, hierarchicalStructure, lineNumbers, invalidLines, wrapperData);
  }

  /**
   * Parse structure string into hierarchical format
   * Example: "name,age,address[street,city]" -> hierarchical structure
   */
  static async parseHierarchicalStructure(structure) {
    const { parseStructure } = await import('./Structure.js');
    return parseStructure(structure);
  }

  /**
   * Build map of field paths to column positions with pre-computed field levels
   * Level 1 fields -> Row 1, Level 2 fields -> Row 2 starting at parent column, etc.
   */
  static buildFieldColumnMap(hierarchicalStructure, lineNumbers = false) {
    const fieldColumnMap = new Map();
    const fieldLevelCache = new Map(); // Pre-compute field levels
    const fieldPathCache = new Map(); // Pre-compute full paths

    // Start from column 1 if line numbers are enabled (column 0 is reserved for line numbers)
    let currentColumn = lineNumbers ? 1 : 0;

    // First pass: Pre-compute all field levels and paths (only for leaf fields)
    const precomputeFieldMetadata = (structure, level, parentPath = '') => {
      structure.forEach(field => {
        const fullPath = parentPath ? `${parentPath}.${field.field}` : field.field;
        const fieldKey = `${field.field}:${level}`;

        if (field.group) {
          // Non-leaf field: only cache level, not path
          fieldLevelCache.set(fieldKey, level);
          precomputeFieldMetadata(field.group, level + 1, fullPath);
        } else {
          // Leaf field: cache both level and path
          fieldLevelCache.set(fieldKey, level);
          fieldPathCache.set(fieldKey, fullPath);
        }
      });
    };

    precomputeFieldMetadata(hierarchicalStructure, 1);

    // Second pass: Build column map using cached metadata
    const processLevel = (structure, level) => {
      structure.forEach(field => {
        const fieldKey = `${field.field}:${level}`;

        if (field.group) {
          // Nested field - record parent position
          fieldColumnMap.set(fieldKey, currentColumn);
          processLevel(field.group, level + 1);
        } else {
          // Leaf field
          fieldColumnMap.set(fieldKey, currentColumn);
          currentColumn++;
        }
      });
    };

    processLevel(hierarchicalStructure, 1);

    // Store caches for later use
    fieldColumnMap._levelCache = fieldLevelCache;
    fieldColumnMap._pathCache = fieldPathCache;

    return fieldColumnMap;
  }

  /**
   * Populate headers using hierarchical structure
   * Level 1 -> Row 1, Level 2 -> Row 2, etc.
   */
  static populateHierarchicalHeaders(table, hierarchicalStructure, fieldColumnMap, lineNumbers = false) {
    let maxDepth = 1;

    // Generic header processing - same logic for all levels
    const populateHeaderLevel = (structure, level, startColumn = 0) => {
      let currentColumn = startColumn;

      structure.forEach((field) => {
        // Generic logic: get column position from field map (same for all levels)
        const fieldKey = `${field.field}:${level}`;
        const dataColumn = fieldColumnMap.get(fieldKey);
        const columnPosition = dataColumn !== undefined ? dataColumn : currentColumn;

        // Always populate header cell (same for all levels)
        const cellRef = table.getCellReference(columnPosition, level);

        // Use label for display, field for data extraction
        let displayLabel = field.label || field.field;

        // Strip surrounding quotes if present
        if (displayLabel.startsWith('"') && displayLabel.endsWith('"')) {
          displayLabel = displayLabel.slice(1, -1);
        }

        table.setCell(cellRef, displayLabel);

        // Transfer format properties from structure to table (same for all levels)
        if (field.properties && Object.keys(field.properties).length > 0) {
          const colRef = table.numberToColumn(columnPosition);
          table.setFormat(colRef, field.properties);
        }

        // Generic recursion: process children if they exist (same for all levels)
        if (field.group) {
          maxDepth = Math.max(maxDepth, level + 1);
          // For children, start at the parent's column position
          const childStartColumn = columnPosition;
          populateHeaderLevel(field.group, level + 1, childStartColumn);
        }

        // Update currentColumn for fallback positioning
        if (dataColumn === undefined) {
          currentColumn++;
        }
      });
    };

    populateHeaderLevel(hierarchicalStructure, 1);


    // Top-level leaf fields should always remain in row 1, regardless of structure complexity
    // This fixes the bug where "id" was appearing in level 3 instead of level 1
    hierarchicalStructure.forEach(field => {
      if (!field.group) {
        // This is a top-level leaf field - it belongs in row 1
        const fieldKey = `${field.field}:1`;
        const dataColumn = fieldColumnMap.get(fieldKey);
        if (dataColumn !== undefined) {
          // Always place top-level leaf fields in row 1
          const cellRef = table.getCellReference(dataColumn, 1);

          let displayLabel = field.label || field.field;
          if (displayLabel.startsWith('"') && displayLabel.endsWith('"')) {
            displayLabel = displayLabel.slice(1, -1);
          }

          // Only set if the cell is empty (don't override existing headers)
          const existingCell = table.getCell(cellRef);
          if (!existingCell || existingCell.multiline[0] === '') {
            table.setCell(cellRef, displayLabel);
          }
        }
      }
    });
  }

  /**
   * Create a compact header layout that places headers consecutively
   * This creates the expected "compact" layout where top-level headers are consecutive
   */
  static createCompactHeaderLayout(hierarchicalStructure) {
    // Simple consecutive placement for level 1
    return hierarchicalStructure.map((field, index) => index);
  }

  // Helper method to calculate column span
  static getColumnSpan(field, level) {
    if (!field.group) {
      return 1;
    }

    let span = 0;
    field.group.forEach(child => {
      span += this.getColumnSpan(child, level + 1);
    });
    return span;
  }

  /**
   * Populate data rows using field column mapping with advanced array handling
   */
  static populateHierarchicalData(table, data, fieldColumnMap, headerRowCount, hierarchicalStructure, lineNumbers = false, invalidLines = [], wrapperData = null) {
    let currentTableRow = headerRowCount + 1; // Start after headers

    // If we have invalid lines, we need to process data and invalid lines together
    if (invalidLines.length > 0) {
      this.populateDataWithInvalidLines(table, data, fieldColumnMap, currentTableRow, hierarchicalStructure, lineNumbers, invalidLines, wrapperData);
    } else {
      // Original logic for when there are no invalid lines
      data.forEach((item, dataIndex) => {
        // Add line number if needed
        if (lineNumbers) {
          const lineNum = wrapperData && wrapperData[dataIndex] ? wrapperData[dataIndex].lineNumber : dataIndex + 1;
          const cellRef = table.getCellReference(0, currentTableRow);
          table.setCell(cellRef, lineNum.toString());
        }

        // Extract all values including arrays for this data item
        const allValues = this.extractAllValuesWithArrays(item, fieldColumnMap, hierarchicalStructure);

        // Process this data item starting at currentTableRow
        const {rowsUsed} = this.populateDataItem(table, allValues, currentTableRow);

        // Update table row counter for next data item
        currentTableRow += rowsUsed;
      });
    }
  }

  /**
   * Populate a single data item with advanced array handling
   * Returns {rowsUsed}
   */
  static populateDataItem(table, allValues, startRow) {

    // Group values by column to handle arrays properly
    const columnData = new Map();

    allValues.forEach(({path, values, column}) => {
      if (!columnData.has(column)) {
        columnData.set(column, []);
      }
      columnData.get(column).push(...(Array.isArray(values) ? values : [values]));
    });

    // Pre-cache column metadata to avoid repeated function calls
    const columnMetadata = new Map();
    for (const [column] of columnData.entries()) {
      const colRef = table.numberToColumn(column);
      const colFormat = table.getFormat(colRef);
      columnMetadata.set(column, {
        ref: colRef,
        format: colFormat,
        hasFixedWidth: !!colFormat.width,
        width: colFormat.width
      });
    }

    // Find the maximum number of rows needed (longest array)
    let maxRows = 1;
    for (const [column, values] of columnData.entries()) {
      maxRows = Math.max(maxRows, values.length);
    }

    // Pre-compute all cell references and values to avoid nested iteration
    const cellOperations = [];
    const formatOperations = [];

    // Single pass: collect all operations
    for (let rowOffset = 0; rowOffset < maxRows; rowOffset++) {
      const currentRow = startRow + rowOffset;

      for (const [column, values] of columnData.entries()) {
        if (rowOffset < values.length && values[rowOffset] !== undefined) {
          const cellRef = table.getCellReference(column, currentRow);
          const rawValue = values[rowOffset];
          const cellValue = this.formatCellValue(rawValue);
          const columnMeta = columnMetadata.get(column);

          if (columnMeta.hasFixedWidth && typeof cellValue === 'string' && cellValue.length > columnMeta.width) {
            // Apply text wrapping and store as multiline content
            const wrappedText = this.wrapTextForTable(cellValue, columnMeta.width);
            cellOperations.push({ cellRef, value: wrappedText });
          } else {
            cellOperations.push({ cellRef, value: cellValue });
          }

          // Set alignment based on original data type (before formatting to string)
          if (this.isNumeric(rawValue)) {
            formatOperations.push({ ref: columnMeta.ref, format: { align: 'right' } });
          }
        }
      }
    }

    // Batch operations: Set all cells at once
    cellOperations.forEach(({ cellRef, value }) => {
      table.setCell(cellRef, value);
    });

    // Batch operations: Set all formats at once
    formatOperations.forEach(({ ref, format }) => {
      table.setFormat(ref, format);
    });

    return {rowsUsed: maxRows};
  }

  /**
   * Populate data with invalid lines interspersed
   * This merges valid data rows with "<invalid line>" rows based on original line numbers
   */
  static populateDataWithInvalidLines(table, data, fieldColumnMap, startRow, hierarchicalStructure, lineNumbers, invalidLines, wrapperData) {
    let currentTableRow = startRow;
    const invalidLinesByLineNum = new Map();

    // Create a map of line numbers to invalid line info
    invalidLines.forEach(invalidLine => {
      invalidLinesByLineNum.set(invalidLine.lineNumber, invalidLine);
    });

    // Create a combined array of all line numbers (both valid and invalid) in order
    const allLineNumbers = new Set();

    // Add valid data line numbers
    if (wrapperData) {
      wrapperData.forEach(wrapper => {
        allLineNumbers.add(wrapper.lineNumber);
      });
    } else {
      data.forEach((item, index) => {
        allLineNumbers.add(index + 1);
      });
    }

    // Add invalid line numbers
    invalidLines.forEach(invalidLine => {
      allLineNumbers.add(invalidLine.lineNumber);
    });

    // Process all line numbers in order
    const sortedLineNumbers = Array.from(allLineNumbers).sort((a, b) => a - b);
    let dataIndex = 0;

    sortedLineNumbers.forEach(lineNum => {
      if (invalidLinesByLineNum.has(lineNum)) {
        // This is an invalid line - add "<invalid line>" row
        this.populateInvalidLineRow(table, fieldColumnMap, currentTableRow, lineNumbers, lineNum);
        currentTableRow += 1;
      } else {
        // This is a valid data line - process the data item
        const item = data[dataIndex];
        const allValues = this.extractAllValuesWithArrays(item, fieldColumnMap, hierarchicalStructure);

        // Add line number if needed
        if (lineNumbers) {
          // Find the line number column (should be column 0)
          const lineNumColumn = 0;
          const cellRef = table.getCellReference(lineNumColumn, currentTableRow);
          table.setCell(cellRef, lineNum.toString());
        }

        const {rowsUsed} = this.populateDataItem(table, allValues, currentTableRow);
        currentTableRow += rowsUsed;
        dataIndex++;
      }
    });
  }

  /**
   * Populate a single invalid line row with "<invalid line>" text
   */
  static populateInvalidLineRow(table, fieldColumnMap, rowNum, lineNumbers, lineNum) {
    // Add line number if needed
    if (lineNumbers) {
      const lineNumColumn = 0;
      const cellRef = table.getCellReference(lineNumColumn, rowNum);
      table.setCell(cellRef, lineNum.toString());
    }

    // Find the first data column and add "<invalid line>" text
    const firstDataColumn = Array.from(fieldColumnMap.values()).sort((a, b) => a - b)[0];
    if (firstDataColumn !== undefined) {
      const cellRef = table.getCellReference(firstDataColumn, rowNum);
      table.setCell(cellRef, '<invalid line>');
    }
  }

  /**
   * Check if a value is numeric
   */
  static isNumeric(value) {
    // Only treat actual JavaScript numbers as numeric for alignment
    // String values (even if they contain only digits) should not be right-aligned
    // This prevents zipCodes, IDs, etc. from being right-aligned
    return typeof value === 'number';
  }

  /**
   * Adjust column widths to account for "<invalid line>" text
   * Similar to legacy BaseTable.addInvalidLineWidths()
   */
  static adjustColumnWidthsForInvalidLines(table, fieldColumnMap) {
    // The width adjustment is handled by the actual "<invalid line>" cells
    // that will be added during data population, so no pre-adjustment needed
    // This method exists for API compatibility but the width calculation
    // happens naturally when the "<invalid line>" cells are added
  }

  /**
   * Calculate the number of header rows based on nesting depth
   */
  static calculateHeaderRowCount(hierarchicalStructure) {
    let maxDepth = 1;

    // Generic depth calculation - no artificial caps
    const findMaxDepth = (structure, depth) => {
      structure.forEach(field => {
        // Track actual depth without artificial limits
        maxDepth = Math.max(maxDepth, depth);

        // Recurse into children if they exist (generic for all levels)
        if (field.group) {
          findMaxDepth(field.group, depth + 1);
        }
      });
    };

    findMaxDepth(hierarchicalStructure, 1);
    return maxDepth;
  }

  /**
   * Extract all values including arrays from nested object and map to columns
   * Uses pre-computed paths for better performance
   */
  static extractAllValuesWithArrays(item, fieldColumnMap, hierarchicalStructure) {
    const results = [];

    // Use pre-computed paths if available, fallback to dynamic calculation
    if (fieldColumnMap._pathCache && fieldColumnMap._levelCache) {
      // Fast path: Use pre-computed metadata, but only for leaf fields
      for (const [fieldKey, fullPath] of fieldColumnMap._pathCache.entries()) {
        const column = fieldColumnMap.get(fieldKey);
        // Only include this path if it has a column mapping (indicating it's a leaf field)
        if (column !== undefined) {
          const values = this.extractAllArrayValues(item, fullPath);
          if (values && values.length > 0) {
            results.push({path: fullPath, values, column});
          }
        }
      }
    } else {
      // Fallback: Dynamic path building (for backward compatibility)
      const buildPaths = (structure, parentPath = '') => {
        structure.forEach(field => {
          const fullPath = parentPath ? `${parentPath}.${field.field}` : field.field;

          if (field.group) {
            buildPaths(field.group, fullPath);
          } else {
            // Leaf field - find its column from the map
            const fieldLevel = parentPath ? (parentPath.split('.').length + 1).toString() : '1';
            const fieldKey = `${field.field}:${fieldLevel}`;
            const column = fieldColumnMap.get(fieldKey);

            if (column !== undefined) {
              const values = this.extractAllArrayValues(item, fullPath);
              if (values && values.length > 0) {
                results.push({path: fullPath, values, column});
              }
            }
          }
        });
      };

      buildPaths(hierarchicalStructure);
    }

    return results;
  }

  /**
   * Extract all values from arrays, handling nested paths properly
   */
  static extractAllArrayValues(obj, path) {
    const parts = path.split('.');
    let current = obj;

    // Navigate to the array or nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (current === null || current === undefined) {
        return [];
      }

      if (Array.isArray(current)) {
        // We've reached an array, need to process remaining path within each array item
        const remainingPath = parts.slice(i).join('.');
        const results = [];

        current.forEach(arrayItem => {
          if (arrayItem && typeof arrayItem === 'object') {
            const itemResult = this.extractAllArrayValues(arrayItem, remainingPath);
            results.push(...itemResult);
          }
        });

        return results;
      } else if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return [];
      }
    }

    const finalField = parts[parts.length - 1];

    // Handle the case where current is an array of objects
    if (Array.isArray(current)) {
      const results = [];

      // If there are more parts after reaching the array, we need to navigate deeper
      const arrayIndex = parts.findIndex((_, i) => {
        let temp = obj;
        for (let j = 0; j <= i; j++) {
          if (temp && typeof temp === 'object' && parts[j] in temp) {
            temp = temp[parts[j]];
          } else {
            return false;
          }
        }
        return Array.isArray(temp);
      });

      const remainingParts = parts.slice(arrayIndex + 1);

      current.forEach(arrayItem => {
        if (arrayItem && typeof arrayItem === 'object') {
          if (remainingParts.length === 0) {
            // No remaining path - the array item itself is the result
            results.push(arrayItem);
          } else {
            // Navigate through remaining path in the array item
            let itemCurrent = arrayItem;
            for (const part of remainingParts) {
              if (itemCurrent && typeof itemCurrent === 'object' && part in itemCurrent) {
                itemCurrent = itemCurrent[part];
              } else {
                itemCurrent = null;
                break;
              }
            }

            if (itemCurrent !== null && itemCurrent !== undefined) {
              results.push(itemCurrent);
            }
          }
        }
      });
      return results.length > 0 ? results : [];
    }

    // Handle regular object property
    if (current && typeof current === 'object' && finalField in current) {
      const value = current[finalField];

      // If the value is an object, return it as-is for proper formatting
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [value];
      }

      // Handle arrays
      if (Array.isArray(value)) {
        // Check if array contains primitive values (should be joined) vs objects (should be separate rows)
        if (value.length > 0 && typeof value[0] !== 'object') {
          // Array of primitives - join with commas for single cell display
          return [value.join(', ')];
        } else {
          // Array of objects - keep as separate items for multi-row display
          return value;
        }
      }

      return [value];
    }

    return [];
  }

  /**
   * Extract leaf values from nested object and map to columns (legacy method for compatibility)
   */
  static extractLeafValues(item, fieldColumnMap, hierarchicalStructure) {
    const results = [];

    // Build full paths for nested fields
    const buildPaths = (structure, parentPath = '') => {
      structure.forEach(field => {
        const fullPath = parentPath ? `${parentPath}.${field.field}` : field.field;

        if (field.group) {
          buildPaths(field.group, fullPath);
        } else {
          // Leaf field - find its column from the map
          for (const [pathKey, column] of fieldColumnMap.entries()) {
            const [mapField, level] = pathKey.split(':');
            if (mapField === field.field) {
              const value = this.getNestedValueWithArraySupport(item, fullPath);
              if (value !== undefined && value !== null) {
                results.push({path: fullPath, value, column});
              }
              break;
            }
          }
        }
      });
    };

    buildPaths(hierarchicalStructure);
    return results;
  }

  /**
   * Get nested value with support for arrays
   * For arrays, returns the value from the first element
   */
  static getNestedValueWithArraySupport(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        // If current value is an array, use the first element
        current = current.length > 0 ? current[0] : undefined;
      }

      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    // Handle final array case - extract from first element if it's an array
    if (Array.isArray(current)) {
      return current.length > 0 ? current[0] : undefined;
    }

    return current;
  }

  /**
   * Process data with line numbers and invalid lines
   */
  static processData(data, lineNumbers, invalidLines, wrapperData) {
    let processedData = Array.isArray(data) ? data : [data];

    // Add line numbers if needed
    if (lineNumbers) {
      processedData = processedData.map((item, index) => {
        const lineNum = wrapperData && wrapperData[index] ? wrapperData[index].lineNumber : index + 1;
        return {
          __lineNumber__: lineNum,
          ...item
        };
      });
    }

    // TODO: Handle invalid lines processing
    return processedData;
  }

  /**
   * Process structure to add line number column if needed
   */
  static processStructure(structure, lineNumbers) {
    if (!lineNumbers) {
      return structure;
    }

    const lineNumberColumn = {
      field: '__lineNumber__',
      key: '__lineNumber__',
      label: '#',
      group: null,
      properties: {}
    };

    return [lineNumberColumn, ...structure];
  }

  /**
   * Populate header cells
   */
  static populateHeaders(table, structure) {
    // Find maximum depth for multi-level headers
    const maxDepth = this.getMaxDepth(structure);

    // Debug output file
    let debugOutput = "=== HEADER MAPPING ===\n";

    // Generate headers row by row
    for (let depth = 0; depth < maxDepth; depth++) {
      const headerRow = this.generateHeaderRow(structure, depth);
      const rowNum = depth + 1;

      headerRow.forEach((headerCell, colIndex) => {
        if (headerCell && headerCell.trim() !== '') {
          const cellRef = table.getCellReference(colIndex, rowNum);
          table.setCell(cellRef, headerCell);
          debugOutput += `${cellRef}: "${headerCell}"\n`;
        }
      });
    }

    // Output debug info to stderr so it can be redirected
    console.error(debugOutput);
  }

  /**
   * Get maximum depth of nested structure
   */
  static getMaxDepth(structure) {
    let maxDepth = 1;
    for (const field of structure) {
      if (field.group) {
        maxDepth = Math.max(maxDepth, 1 + this.getMaxDepth(field.group));
      }
    }
    return maxDepth;
  }

  /**
   * Generate header row for specific depth level
   */
  static generateHeaderRow(structure, depth) {
    const headerRow = [];

    for (const field of structure) {
      if (depth === 0) {
        // Top level - show field label
        headerRow.push(field.label);

        if (field.group) {
          // Fill remaining columns for this group with empty strings
          const leafCount = this.countLeafFields(field.group);
          for (let i = 1; i < leafCount; i++) {
            headerRow.push('');
          }
        }
      } else if (field.group) {
        // Nested level - recurse into group
        const nestedRow = this.generateHeaderRow(field.group, depth - 1);
        headerRow.push(...nestedRow);
      } else {
        // Leaf field at wrong depth - empty
        headerRow.push('');
      }
    }

    return headerRow;
  }

  /**
   * Count leaf fields in structure
   */
  static countLeafFields(structure) {
    let count = 0;
    for (const field of structure) {
      if (field.group) {
        count += this.countLeafFields(field.group);
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Populate data rows
   */
  static populateDataRows(table, data, structure) {
    const headerRowCount = this.getMaxDepth(structure);

    // Debug output file
    let debugOutput = "=== DATA MAPPING ===\n";

    data.forEach((item, dataIndex) => {
      const rowNum = headerRowCount + dataIndex + 1;
      const values = this.extractValues(item, structure);

      values.forEach((value, colIndex) => {
        const cellRef = table.getCellReference(colIndex, rowNum);
        const cellValue = this.formatCellValue(value);
        table.setCell(cellRef, cellValue);
        debugOutput += `${cellRef}: "${cellValue}"\n`;
      });
    });

    // Output debug info to stderr so it can be redirected
    console.error(debugOutput);
  }

  /**
   * Extract values from data item according to structure
   */
  static extractValues(item, structure) {
    const values = [];

    for (const field of structure) {
      if (field.group) {
        // Nested structure - extract from nested object/array
        const nestedData = this.getNestedValue(item, field.key);
        if (Array.isArray(nestedData)) {
          // Handle array - take first item for now
          const firstItem = nestedData[0] || {};
          const nestedValues = this.extractValues(firstItem, field.group);
          values.push(...nestedValues);
        } else {
          const nestedValues = this.extractValues(nestedData || {}, field.group);
          values.push(...nestedValues);
        }
      } else {
        // Leaf field - extract value
        const value = this.getNestedValue(item, field.key);
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Get nested value using dot notation or direct access
   */
  static getNestedValue(obj, key) {
    if (!obj || !key) return '';

    // Handle special fields
    if (key === '__lineNumber__') {
      return obj.__lineNumber__ || '';
    }

    // Handle dot notation
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === null || current === undefined) return '';
        current = current[part];
      }
      return current;
    }

    // Direct access
    return obj[key];
  }

  /**
   * Format cell value for display
   */
  static formatCellValue(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return '[object Object]';
    return String(value);
  }

  /**
   * Parse ASCII output into Table cells
   * This converts the working ASCII logic into our Excel-like cell structure
   */
  static parseAsciiIntoTable(table, asciiOutput) {
    if (!asciiOutput || asciiOutput.trim() === '') {
      return;
    }

    const lines = asciiOutput.split('\n');
    const allRowColumns = [];

    // First pass: parse all lines and find the maximum column count
    let maxColumns = 0;
    let firstRowPositions = null; // Track first row positions to establish column boundaries

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
      const line = lines[rowIndex];
      if (line.trim() === '') continue;

      const columns = this.parseLineColumns(line);
      allRowColumns.push(columns);
      maxColumns = Math.max(maxColumns, columns.length);

      // Store first row positions as the reference for grid columns
      if (rowIndex === 0 && columns._positions) {
        firstRowPositions = columns._positions;
      }
    }

    // Set up grid column boundaries based on first row
    if (firstRowPositions) {
      this.setupGridColumnBoundaries(firstRowPositions);
    }

    // Second pass: populate cells with proper column alignment
    for (let rowIndex = 0; rowIndex < allRowColumns.length; rowIndex++) {
      const columns = allRowColumns[rowIndex];

      // For nested structures, we need to align columns properly
      // If this row has fewer columns than max, we need to determine the correct positioning
      if (columns.length < maxColumns) {
        // This is likely a header row that needs proper alignment
        const alignedColumns = this.alignColumnsForNestedStructure(columns, maxColumns, allRowColumns, rowIndex);

        for (let colIndex = 0; colIndex < alignedColumns.length; colIndex++) {
          const cellRef = table.getCellReference(colIndex, rowIndex + 1);
          const content = alignedColumns[colIndex];

          if (content !== '') {
            // Clean content (remove ANSI codes for storage)
            const cleanContent = content.replace(/\x1b\[[0-9;]*m/g, '');
            table.setCell(cellRef, cleanContent);


            // Store the original formatted content for ASCII rendering
            if (content !== cleanContent) {
              table.setFormat(cellRef, {
                originalContent: content,
                hasColor: true
              });
            }
          }
        }
      } else {
        // Full row - populate normally
        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const cellRef = table.getCellReference(colIndex, rowIndex + 1);
          const content = columns[colIndex];

          // Clean content (remove ANSI codes for storage)
          const cleanContent = content.replace(/\x1b\[[0-9;]*m/g, '');
          table.setCell(cellRef, cleanContent);


          // Store the original formatted content for ASCII rendering
          if (content !== cleanContent) {
            table.setFormat(cellRef, {
              originalContent: content,
              hasColor: true
            });
          }
        }
      }
    }

  }

  /**
   * Align columns for nested structures using position information
   */
  static alignColumnsForNestedStructure(columns, maxColumns, allRowColumns, currentRowIndex) {
    const result = new Array(maxColumns).fill('');

    // Use position-aware mapping if available
    if (columns._positions) {
      return this.mapColumnsToGridPositions(columns, columns._positions, maxColumns);
    }

    // Fallback to original logic for rows without position information
    const dataRows = allRowColumns.filter(row => row.length === maxColumns);

    if (dataRows.length === 0 || columns.length === maxColumns) {
      columns.forEach((col, i) => {
        if (i < maxColumns) result[i] = col;
      });
      return result;
    }

    if (currentRowIndex === 0) {
      columns.forEach((col, i) => {
        result[i] = col;
      });
    } else {
      this.positionSubHeaders(columns, result, allRowColumns, currentRowIndex, maxColumns);
    }

    return result;
  }

  /**
   * Map columns to grid positions based on their visual positions in ASCII
   */
  static mapColumnsToGridPositions(columns, positions, maxColumns) {
    const result = new Array(maxColumns).fill('');

    // Debug: Log the positions to understand the mapping
    if (process.env.DEBUG_POSITIONS) {
    }

    // Create a mapping from character positions to grid columns
    // This needs to be based on the visual layout of the ASCII table

    for (let i = 0; i < columns.length && i < positions.length; i++) {
      const visualPos = positions[i];
      const columnName = columns[i];

      // Check if this is a data header that should go to the data area
      const isDataHeader = this.isDataHeader(columnName, i, columns);

      let gridCol;
      if (isDataHeader) {
        // Data headers go to the data area (dynamic calculation based on column count)
        const structuralCount = this.getStructuralHeaderCount(columns);
        const dataAreaStart = Math.max(structuralCount, Math.floor(maxColumns * 0.6));
        gridCol = Math.min(dataAreaStart + (i - structuralCount), maxColumns - 1);
      } else {
        // Structural headers follow normal position mapping
        gridCol = this.visualPositionToGridColumn(visualPos, maxColumns, false);
      }


      if (gridCol >= 0 && gridCol < maxColumns) {
        result[gridCol] = columnName;
      }
    }

    return result;
  }

  /**
   * Determine if a header represents data (vs structural configuration)
   * Uses generic heuristics instead of hardcoded field names
   */
  static isDataHeader(headerName, index, allHeaders) {
    // Strip ANSI color codes before checking
    const cleanName = headerName.replace(/\x1b\[[0-9;]*m/g, '').trim();

    // Empty headers are not data headers
    if (!cleanName) {
      return false;
    }

    // Headers in the last third of columns are likely data fields
    // This replaces the hardcoded length > 5 check with proportional logic
    const lastThirdStart = Math.floor(allHeaders.length * 0.67);
    if (allHeaders.length >= 3 && index >= lastThirdStart) {
      return true;
    }

    // Short, common data field patterns (generic patterns, not specific names)
    // These are typical data field characteristics
    if (cleanName.length <= 8 && /^[a-zA-Z][a-zA-Z0-9]*$/.test(cleanName)) {
      // Simple alphanumeric names are likely data fields if they appear after position 2
      if (index >= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Count how many headers are structural (not data)
   */
  static getStructuralHeaderCount(allHeaders) {
    let count = 0;
    for (let i = 0; i < allHeaders.length; i++) {
      if (!this.isDataHeader(allHeaders[i], i, allHeaders)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Set up grid column boundaries based on first row positions
   */
  static setupGridColumnBoundaries(firstRowPositions) {
    this.gridColumnBoundaries = firstRowPositions.map((pos, index) => ({
      startPos: pos,
      gridCol: index
    }));
  }

  /**
   * Convert visual character position to grid column index
   */
  static visualPositionToGridColumn(visualPos, maxColumns, allowDataArea = true) {
    // Use first row positions as reference if available
    if (this.gridColumnBoundaries) {
      // Special handling: if the position is much further right than the last boundary,
      // it likely belongs in the data area (columns 7-8)
      const lastBoundary = this.gridColumnBoundaries[this.gridColumnBoundaries.length - 1];

      // Only map to data area if allowed and position is significantly beyond the last boundary
      if (allowDataArea && lastBoundary && visualPos > lastBoundary.startPos + 50) {
        // Map to data area (starting around 2/3 of available columns)
        const dataAreaStart = Math.floor(maxColumns * 0.6);
        return Math.min(dataAreaStart, maxColumns - 1);
      }

      // Find the closest grid column based on the first row boundaries
      let bestMatch = 0;
      let bestDistance = Math.abs(visualPos - this.gridColumnBoundaries[0].startPos);

      for (let i = 1; i < this.gridColumnBoundaries.length; i++) {
        const distance = Math.abs(visualPos - this.gridColumnBoundaries[i].startPos);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = i;
        }
      }

      return bestMatch;
    }

    // Fallback to dynamic calculation if no boundaries available
    // Estimate average column width based on position and max columns
    const estimatedColumnWidth = visualPos > 0 ? Math.max(8, visualPos / Math.min(maxColumns, 8)) : 10;
    const estimatedColumn = Math.floor(visualPos / estimatedColumnWidth);

    return Math.min(estimatedColumn, maxColumns - 1);
  }

  /**
   * Position sub-headers intelligently based on hierarchical structure
   */
  static positionSubHeaders(columns, result, allRowColumns, currentRowIndex, maxColumns) {
    // Find the parent row (usually the previous row with fewer columns)
    const parentRowIndex = currentRowIndex - 1;
    if (parentRowIndex >= 0 && parentRowIndex < allRowColumns.length) {
      const parentRow = allRowColumns[parentRowIndex];

      // Try to position sub-headers under their logical parent headers
      const positioning = this.calculateHierarchicalPositions(columns, parentRow, maxColumns);

      if (positioning) {
        // Use hierarchical positioning
        positioning.forEach((pos, i) => {
          if (pos !== -1 && i < columns.length) {
            result[pos] = columns[i];
          }
        });
        return;
      }
    }

    // Fallback: right-align sub-headers (preserves existing functionality)
    const offset = maxColumns - columns.length;
    columns.forEach((col, i) => {
      result[offset + i] = col;
    });
  }

  /**
   * Calculate hierarchical positions for sub-headers under parent headers
   */
  static calculateHierarchicalPositions(subHeaders, parentRow, maxColumns) {
    // The header positioning should be handled by the generateHeaderRow method
    // in populateHeaders. This method should not override that logic.
    // Return null to use fallback positioning.
    return null;
  }

  /**
   * Calculate positions for complex hierarchical structures
   */
  static calculateComplexHierarchicalPositions(subHeaders, parentRow, maxColumns) {
    // This handles cases where we have more sub-headers than parent headers
    // We need to distribute them across the available columns intelligently

    const positions = [];
    const parentPositions = [];

    // Find positions of non-empty parent headers
    for (let i = 0; i < parentRow.length && i < maxColumns; i++) {
      if (parentRow[i] && parentRow[i].trim() !== '') {
        parentPositions.push(i);
      }
    }

    if (parentPositions.length === 0) {
      // No parent structure to follow, fall back to right-alignment
      return null;
    }

    // Distribute sub-headers across parent positions and beyond
    let currentParentIndex = 0;

    for (let i = 0; i < subHeaders.length; i++) {
      if (currentParentIndex < parentPositions.length) {
        // Position under the current parent
        positions.push(parentPositions[currentParentIndex]);
        currentParentIndex++;
      } else {
        // Position in remaining columns
        const remainingPosition = parentPositions[parentPositions.length - 1] +
                                (i - parentPositions.length + 1);
        if (remainingPosition < maxColumns) {
          positions.push(remainingPosition);
        } else {
          positions.push(-1);
        }
      }
    }

    return positions;
  }

  /**
   * Structure parsing methods
   */
  static generateHierarchicalKeys(items, parentKey = '') {
    return items.map(item => {
      const hierarchicalKey = parentKey ? `${parentKey}.${item.field}` : item.field;

      const updatedItem = {
        ...item,
        key: hierarchicalKey
      };

      if (item.group) {
        updatedItem.group = this.generateHierarchicalKeys(item.group, hierarchicalKey);
      }

      return updatedItem;
    });
  }

  static parseItems(str) {
    const items = [];
    let current = '';
    let bracketDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '[') bracketDepth++;
      else if (char === ']') bracketDepth--;

      if (char === ',' && bracketDepth === 0) {
        items.push(this.parseItem(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      items.push(this.parseItem(current.trim()));
    }

    return items;
  }

  static parseItem(item) {
    const fieldMatch = item.match(/^([^:[\]{]+)/);
    if (!fieldMatch) {
      throw new Error(`Invalid structure item: ${item}`);
    }

    const field = fieldMatch[1];
    const labelMatch = item.match(/^[^:[\]{]+:([^[\]{]+)/);
    const label = labelMatch ? labelMatch[1] : field;

    let groupStr = null;
    let propertiesStr = null;

    const fieldAndLabel = labelMatch ? `${field}:${label}` : field;
    let remaining = item.substring(fieldAndLabel.length);

    if (remaining.startsWith('[')) {
      let bracketCount = 0;
      let groupEnd = -1;

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i] === '[') bracketCount++;
        else if (remaining[i] === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            groupEnd = i;
            break;
          }
        }
      }

      if (groupEnd !== -1) {
        groupStr = remaining.substring(1, groupEnd);
        remaining = remaining.substring(groupEnd + 1);
      }
    }

    if (remaining.startsWith('{')) {
      const propsEnd = remaining.indexOf('}');
      if (propsEnd !== -1) {
        propertiesStr = remaining.substring(1, propsEnd);
      }
    }

    let group = null;
    if (groupStr) {
      group = this.parseItems(groupStr);
    }

    let properties = {};
    if (propertiesStr) {
      properties = this.parseProperties(propertiesStr);
    }

    return {
      field: field,
      key: field,
      label: label,
      group: group,
      properties: properties
    };
  }

  static parseProperties(propertiesStr) {
    const properties = {};

    if (propertiesStr) {
      propertiesStr
        .split(";")
        .map(property => property.split(":"))
        .forEach(([key, value]) => {
          if (key && value !== undefined) {
            if (!isNaN(value)) {
              properties[key] = parseInt(value);
            } else {
              properties[key] = value;
            }
          }
        });
    }

    return properties;
  }

  /**
   * Parse a line into columns by splitting on multiple spaces
   */
  static parseLineColumns(line) {
    // Position-aware parsing: split by multiple spaces but track positions
    const columns = [];
    const columnPositions = [];

    // Split by 2+ spaces to identify column boundaries
    const parts = line.split(/(\s{2,})/); // Keep separators to track positions
    let currentPos = 0;

    for (let i = 0; i < parts.length; i += 2) { // Skip separators (odd indices)
      const part = parts[i];
      if (part && part.trim() !== '') {
        columns.push(part.trim());
        columnPositions.push(currentPos);
      }

      // Update position for next iteration
      currentPos += part ? part.length : 0;
      if (i + 1 < parts.length) {
        currentPos += parts[i + 1].length; // Add separator length
      }
    }

    // Store positional information for use in alignment
    columns._positions = columnPositions;
    return columns;
  }

  /**
   * Wrap text to fit within specified width, returns array of lines
   */
  static wrapTextForTable(text, width) {
    if (!text || width <= 0) return [''];

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;

      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is longer than width, break it
          lines.push(word.substring(0, width));
          currentLine = word.substring(width);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

}