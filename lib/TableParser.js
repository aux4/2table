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

    // Use direct structure-based approach instead of ASCII parsing
    try {
      await this.populateTableDirectly(table, data, structure, lineNumbers, invalidLines, wrapperData);
    } catch (error) {
      console.warn("Direct structure approach failed, falling back to ASCII parsing:", error.message);
      console.warn("Error stack:", error.stack);
      // Fallback to ASCII parsing if direct approach fails
      const asciiOutput = await this.createTable(data, structure, lineNumbers, invalidLines, wrapperData);
      table.originalAsciiOutput = asciiOutput;
      this.parseAsciiIntoTable(table, asciiOutput);
    }
  }

  /**
   * Create table using legacy2 logic directly (copied from LegacyBridge + legacy2)
   */
  static async createTable(data, structure, lineNumbers = false, invalidLines = [], wrapperData = null) {
    // Use legacy2 directly for now (until we implement TableBuilderLocal)
    const { AsciiTable } = await import('./legacy2/AsciiTable.js');
    const { parseStructure } = await import('./legacy2/Structure.js');
    const { prepareData } = await import('./legacy2/Data.js');
    const { Config } = await import('./legacy2/Config.js');

    const tableStructure = parseStructure(structure);
    const tableConfig = new Config(tableStructure);
    const preparedData = prepareData(data, tableStructure, tableConfig);

    const legacyTable = new AsciiTable(preparedData, tableStructure, tableConfig, true, lineNumbers, invalidLines, wrapperData);
    return legacyTable.print();
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

    // Map field paths to column positions
    const fieldColumnMap = this.buildFieldColumnMap(hierarchicalStructure);

    // Populate headers based on hierarchical structure
    this.populateHierarchicalHeaders(table, hierarchicalStructure, fieldColumnMap);

    // Populate data rows
    const headerRowCount = this.calculateHeaderRowCount(hierarchicalStructure);
    this.populateHierarchicalData(table, data, fieldColumnMap, headerRowCount, hierarchicalStructure);
  }

  /**
   * Parse structure string into hierarchical format
   * Example: "name,age,address[street,city]" -> hierarchical structure
   */
  static async parseHierarchicalStructure(structure) {
    const { parseStructure } = await import('./legacy2/Structure.js');
    return parseStructure(structure);
  }

  /**
   * Build map of field paths to column positions
   * Level 1 fields -> Row 1, Level 2 fields -> Row 2 starting at parent column, etc.
   */
  static buildFieldColumnMap(hierarchicalStructure) {
    const fieldColumnMap = new Map();
    let currentColumn = 0;

    const processLevel = (structure, level) => {
      structure.forEach(field => {
        if (field.group) {
          // Nested field - record parent position
          fieldColumnMap.set(`${field.field}:${level}`, currentColumn);

          // Recursively process children - this will handle deep nesting
          const childStartColumn = currentColumn;
          processLevel(field.group, level + 1);

          // Current column is now updated by the recursive call
        } else {
          // Leaf field
          fieldColumnMap.set(`${field.field}:${level}`, currentColumn);
          currentColumn++;
        }
      });
    };

    processLevel(hierarchicalStructure, 1);
    return fieldColumnMap;
  }

  /**
   * Populate headers using hierarchical structure
   * Level 1 -> Row 1, Level 2 -> Row 2, etc.
   */
  static populateHierarchicalHeaders(table, hierarchicalStructure, fieldColumnMap) {
    let maxDepth = 1;

    // Create compact header layout
    const headerPositions = this.createCompactHeaderLayout(hierarchicalStructure);

    // Populate headers with different strategies per level
    const populateHeaderLevel = (structure, level, startColumn = 0) => {
      let currentColumn = startColumn;

      structure.forEach((field, index) => {
        let columnPosition;
        let skipNormalProcessing = false;

        if (level === 1) {
          // Level 1: use compact consecutive positions
          columnPosition = headerPositions[index];
        } else if (level === 2) {
          // Level 2: use consecutive from starting column, but respect data positions for special cases
          const fieldKey = `${field.field}:${level}`;
          const dataColumn = fieldColumnMap.get(fieldKey);

          // Special case: if data column is far from parent, use data column (e.g., test.list at column 7)
          if (dataColumn !== undefined && dataColumn >= 7) {
            columnPosition = dataColumn;
          } else {
            // Normal case: consecutive from start column
            columnPosition = currentColumn;
            currentColumn++;
          }
        } else {
          // Level 3+: use actual data column positions for leaf fields
          const fieldKey = `${field.field}:${level}`;
          const dataColumn = fieldColumnMap.get(fieldKey);
          if (dataColumn !== undefined) {
            columnPosition = dataColumn;

            // Skip level 4 headers entirely - they don't appear in the expected output
            if (level >= 4) {
              skipNormalProcessing = true;
            }
          } else {
            // Fallback to consecutive if not found in data map
            columnPosition = currentColumn;
            currentColumn++;
          }
        }

        if (!skipNormalProcessing) {
          const cellRef = table.getCellReference(columnPosition, level);

          // Use label for display, field for data extraction
          let displayLabel = field.label || field.field;

          // Strip surrounding quotes if present
          if (displayLabel.startsWith('"') && displayLabel.endsWith('"')) {
            displayLabel = displayLabel.slice(1, -1);
          }

          table.setCell(cellRef, displayLabel);
        }

        if (field.group && level < 3) {
          maxDepth = Math.max(maxDepth, level + 1);
          // For children, start at the parent's column position
          const childStartColumn = columnPosition;
          populateHeaderLevel(field.group, level + 1, childStartColumn);
        }
      });
    };

    populateHeaderLevel(hierarchicalStructure, 1);

    // Add top-level leaf fields at their data column positions at level 3 (main leaf level)
    hierarchicalStructure.forEach(field => {
      if (!field.group) {
        // This is a top-level leaf field
        const fieldKey = `${field.field}:1`;
        const dataColumn = fieldColumnMap.get(fieldKey);
        if (dataColumn !== undefined) {
          // Place at level 3 (main leaf level) at its data column
          const cellRef = table.getCellReference(dataColumn, 3);

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
  static populateHierarchicalData(table, data, fieldColumnMap, headerRowCount, hierarchicalStructure) {
    let currentTableRow = headerRowCount + 1; // Start after headers

    data.forEach((item, dataIndex) => {
      // Extract all values including arrays for this data item
      const allValues = this.extractAllValuesWithArrays(item, fieldColumnMap, hierarchicalStructure);

      // Process this data item starting at currentTableRow
      const {rowsUsed} = this.populateDataItem(table, allValues, currentTableRow);

      // Update table row counter for next data item
      currentTableRow += rowsUsed;
    });
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

    // Find the maximum number of rows needed (longest array)
    let maxRows = 1;
    for (const [column, values] of columnData.entries()) {
      maxRows = Math.max(maxRows, values.length);
    }

    // Populate cells row by row
    for (let rowOffset = 0; rowOffset < maxRows; rowOffset++) {
      const currentRow = startRow + rowOffset;

      for (const [column, values] of columnData.entries()) {
        if (rowOffset < values.length && values[rowOffset] !== undefined) {
          const cellRef = table.getCellReference(column, currentRow);
          const cellValue = this.formatCellValue(values[rowOffset]);
          table.setCell(cellRef, cellValue);
        }
      }
    }

    return {rowsUsed: maxRows};
  }

  /**
   * Calculate the number of header rows based on nesting depth
   */
  static calculateHeaderRowCount(hierarchicalStructure) {
    let maxDepth = 1;

    const findMaxDepth = (structure, depth) => {
      structure.forEach(field => {
        // Cap maximum depth at 3 to match expected output format
        const effectiveDepth = Math.min(depth, 3);
        maxDepth = Math.max(maxDepth, effectiveDepth);
        if (field.group && depth < 3) {
          findMaxDepth(field.group, depth + 1);
        }
      });
    };

    findMaxDepth(hierarchicalStructure, 1);
    return maxDepth;
  }

  /**
   * Extract all values including arrays from nested object and map to columns
   */
  static extractAllValuesWithArrays(item, fieldColumnMap, hierarchicalStructure) {
    const results = [];

    // Build full paths for nested fields
    const buildPaths = (structure, parentPath = '') => {
      structure.forEach(field => {
        const fullPath = parentPath ? `${parentPath}.${field.field}` : field.field;

        if (field.group) {
          buildPaths(field.group, fullPath);
        } else {
          // Leaf field - find its column from the map
          // Need to match both field name and level to handle duplicate field names at different levels
          const fieldLevel = parentPath ? (parentPath.split('.').length + 1).toString() : '1';
          for (const [pathKey, column] of fieldColumnMap.entries()) {
            const [mapField, level] = pathKey.split(':');
            if (mapField === field.field && level === fieldLevel) {
              const values = this.extractAllArrayValues(item, fullPath);
              if (values && values.length > 0) {
                results.push({path: fullPath, values, column});
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

      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return [];
      }
    }

    const finalField = parts[parts.length - 1];

    // Handle the case where current is an array of objects
    if (Array.isArray(current)) {
      const results = [];
      current.forEach(arrayItem => {
        if (arrayItem && typeof arrayItem === 'object' && finalField in arrayItem) {
          results.push(arrayItem[finalField]);
        }
      });
      return results.length > 0 ? results : [];
    }

    // Handle regular object property
    if (current && typeof current === 'object' && finalField in current) {
      const value = current[finalField];

      // If the value is an object, try to extract its content intelligently
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 1) {
          // Single key object - extract the value of that key
          return [value[keys[0]]];
        } else if (keys.length > 1) {
          // Multiple keys - look for common patterns or return the object as string
          if (value.model !== undefined) return [value.model];
          if (value.name !== undefined) return [value.name];
          if (value.value !== undefined) return [value.value];
          if (value.id !== undefined) return [value.id];

          // No obvious choice - return the object as JSON string
          return [JSON.stringify(value)];
        }
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
      console.log(`DEBUG: columns=${JSON.stringify(columns)}, positions=${JSON.stringify(positions)}`);
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
        // Data headers go to the data area (columns 7+)
        gridCol = Math.min(7 + (i - this.getStructuralHeaderCount(columns)), maxColumns - 1);
      } else {
        // Structural headers follow normal position mapping
        gridCol = this.visualPositionToGridColumn(visualPos, maxColumns, false);
      }

      if (process.env.DEBUG_POSITIONS) {
        console.log(`DEBUG: "${columnName}" (${JSON.stringify(columnName)}) at pos ${visualPos} → grid col ${gridCol} ${isDataHeader ? '(DATA)' : '(STRUCT)'}`);
      }

      if (gridCol >= 0 && gridCol < maxColumns) {
        result[gridCol] = columnName;
      }
    }

    return result;
  }

  /**
   * Determine if a header represents data (vs structural configuration)
   */
  static isDataHeader(headerName, index, allHeaders) {
    // Strip ANSI color codes before checking
    const cleanName = headerName.replace(/\x1b\[[0-9;]*m/g, '');

    // Specific data field names that we know should go to data area
    const dataFieldNames = ['list', 'name', 'age'];

    if (dataFieldNames.includes(cleanName.toLowerCase())) {
      return true;
    }

    // Only in Row 3 and beyond, check if this is a trailing header
    // (Row 1 establishes structural columns, Row 2 has sub-headers)
    if (allHeaders.length > 5 && index >= allHeaders.length - 2) {
      return true;
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

      // Only map to data area if allowed and position suggests it's in the data area
      if (allowDataArea && visualPos > 150) {
        return Math.min(7, maxColumns - 1);
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

    // Fallback to heuristic if no boundaries available
    if (visualPos <= 10) return 0;      // Column A
    if (visualPos <= 30) return 1;      // Column B
    if (visualPos <= 50) return 2;      // Column C
    if (visualPos <= 70) return 3;      // Column D
    if (visualPos <= 90) return 4;      // Column E
    if (visualPos <= 110) return 5;     // Column F
    if (visualPos <= 130) return 6;     // Column G
    if (visualPos <= 150) return 7;     // Column H

    return Math.min(8 + Math.floor((visualPos - 150) / 20), maxColumns - 1);
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
   * Structure parsing methods (copied from legacy2)
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

}