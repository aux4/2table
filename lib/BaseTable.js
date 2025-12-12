import moment from "moment";
import { Config, Control } from "./Config.js";
import { size } from "./Utils.js";
import colors from "colors";

class BaseTable {
  constructor(data, structure, configuration, includeHeaders = true, lineNumbers = false, invalidLines = [], wrapperData = null) {
    this.originalData = data;
    this.originalStructure = structure;
    this.lineNumbers = lineNumbers;
    this.invalidLines = invalidLines || [];
    this.wrapperData = wrapperData;

    if (lineNumbers) {
      // Add line numbers to data and structure
      this.data = this.addLineNumbersToData(data);
      this.structure = this.addLineNumberToStructure(structure);

      // Create new config that includes line number column but preserves original widths
      this.config = this.createConfigWithLineNumbers(configuration, this.structure);
    } else {
      this.data = data;
      this.structure = structure;
      this.config = configuration || new Config(this.structure);
    }

    // Account for invalid line widths in column calculations
    if (this.invalidLines.length > 0) {
      this.addInvalidLineWidths();
    }

    this.includeHeaders = includeHeaders;
    this.rows = [];

    this.buildTable();
  }

  addLineNumbersToData(data) {
    // Use wrapper data for line numbers if available, otherwise fall back to sequential
    return data.map((item, index) => {
      let lineNum = index + 1; // Default sequential numbering

      if (this.wrapperData && this.wrapperData[index]) {
        lineNum = this.wrapperData[index].lineNumber;
      }

      return {
        '__lineNumber__': lineNum,
        ...item
      };
    });
  }

  addLineNumberToStructure(structure) {
    // Calculate the width needed for line numbers based on actual max line number
    let maxLineNumber = this.originalData.length;

    if (this.wrapperData && this.wrapperData.length > 0) {
      maxLineNumber = Math.max(...this.wrapperData.map(wrapper => wrapper.lineNumber));
    }
    const lineNumberWidth = Math.max(1, String(maxLineNumber).length);

    // Create right-aligned header label
    const rightAlignedHeader = '#'.padStart(lineNumberWidth, ' ');

    // Create line number column structure that will be processed normally
    const lineNumberColumn = {
      key: '__lineNumber__',
      field: '__lineNumber__',
      label: rightAlignedHeader,
      extractor: (data) => data,
      properties: {},
      style: () => (text) => text
    };

    return [lineNumberColumn, ...structure];
  }

  createConfigWithLineNumbers(originalConfig, newStructure) {
    const combinedConfig = {};

    // Add line number column config
    const lineNumberColumn = newStructure[0]; // First column is line numbers
    const maxLineNumber = this.originalData.length;
    const lineNumberWidth = Math.max(1, String(maxLineNumber).length);

    combinedConfig[lineNumberColumn.key] = {
      width: new Control(lineNumberWidth)
    };

    // Copy original configs for all other columns
    newStructure.slice(1).forEach(structureItem => {
      if (originalConfig && originalConfig[structureItem.key]) {
        combinedConfig[structureItem.key] = originalConfig[structureItem.key];
      }
    });

    return combinedConfig;
  }

  addInvalidLineWidths() {
    // Find the first data column (non-line number column)
    const firstDataColumn = this.structure.find(s => s.key !== '__lineNumber__');
    if (firstDataColumn && this.config[firstDataColumn.key]) {
      // Add the width of '<invalid line>' text to the first column's width calculation
      this.config[firstDataColumn.key].width.add('<invalid line>'.length);
    }
  }
  
  buildTable() {
    if (this.includeHeaders) {
      this.rows.push(this.createHeader(this.structure, this.config));

      const hasNested = this.structure.some(structureItem => structureItem.group);

      if (hasNested) {
        const maxDepth = this.getMaxNestingDepth(this.structure);

        for (let level = 1; level < maxDepth; level++) {
          this.rows.push(this.createNestedHeaderRowAtLevel(this.structure, this.config, level));
        }
      }
    }

    // Combine valid data and invalid lines, then sort by line number
    const allItems = this.createCombinedItemsWithInvalidLines();

    allItems.forEach(item => {
      if (item.isInvalid) {
        // Handle invalid line
        const invalidRow = this.createInvalidLineRow(item);
        this.rows.push(invalidRow);
      } else {
        // Handle normal data
        const rowsForItem = this.createRowsForItem(item, this.structure, this.config);
        rowsForItem.forEach(row => this.rows.push(row));
      }
    });
  }

  createCombinedItemsWithInvalidLines() {
    const allItems = [];

    // Add all valid data items with their line numbers
    this.data.forEach((item, index) => {
      let lineNumber = index + 1; // Default sequential

      // Get line number from wrapper data if available
      if (this.wrapperData && this.wrapperData[index]) {
        lineNumber = this.wrapperData[index].lineNumber;
      }

      allItems.push({
        ...item,
        isInvalid: false,
        lineNumber: lineNumber
      });
    });

    // Add invalid lines if they should be shown
    this.invalidLines.forEach(invalidLine => {
      allItems.push({
        isInvalid: true,
        lineNumber: invalidLine.lineNumber,
        reason: invalidLine.reason
      });
    });

    // Sort by line number to maintain original order
    allItems.sort((a, b) => (a.lineNumber || 0) - (b.lineNumber || 0));

    return allItems;
  }

  createInvalidLineRow(invalidItem) {
    return new InvalidLineRow(invalidItem, this.structure, this.config, this);
  }

  createRowsForItem(item, structure, config) {
    const rows = [];
    const hasNestedArrays = structure.some(structureItem =>
      structureItem.group && Array.isArray(item[structureItem.key])
    );
    
    if (!hasNestedArrays) {
      rows.push(this.createRow(item, structure, config));
      return rows;
    }
    
    const nestedArraySizes = structure
      .filter(structureItem => structureItem.group && Array.isArray(item[structureItem.key]))
      .map(structureItem => item[structureItem.key].length);
    
    const maxNestedSize = Math.max(...nestedArraySizes, 1);
    
    for (let i = 0; i < maxNestedSize; i++) {
      rows.push(this.createNestedDataRow(item, structure, config, i));
    }
    
    return rows;
  }
  
  createGlobalNestedHeaderRow(structure, config) {
    return new BaseGlobalNestedHeaderRow(structure, config, this);
  }
  
  createNestedHeaderRow(item, structure, config) {
    return new BaseNestedHeaderRow(item, structure, config, this);
  }
  
  createNestedDataRow(item, structure, config, arrayIndex) {
    return new BaseNestedDataRow(item, structure, config, arrayIndex, this);
  }
  
  createHeader(structure, config) {
    return new BaseHeader(structure, config, this.getHeaderStyle(), this);
  }
  
  createRow(item, structure, config) {
    return new BaseRow(item, structure, config, this);
  }
  
  getHeaderStyle() {
    return text => text;
  }
  
  print() {
    return this.rows
      .map(row => row.print())
      .filter(row => row.length > 0)
      .join(this.getRowSeparator());
  }
  
  getRowSeparator() {
    return "\n";
  }
  
  createCell(config, data) {
    return new BaseCell(config, data);
  }
  
  getMaxNestingDepth(structure) {
    let maxDepth = 1;
    for (const item of structure) {
      if (item.group) {
        const nestedDepth = 1 + this.getMaxNestingDepth(item.group);
        maxDepth = Math.max(maxDepth, nestedDepth);
      }
    }
    return maxDepth;
  }
  
  createNestedHeaderRowAtLevel(structure, config, level) {
    return new BaseNestedHeaderRowAtLevel(structure, config, level, this);
  }
}

class BaseHeader {
  constructor(structure, config, customStyle, table) {
    this.structure = structure;
    this.config = config;
    this.customStyle = customStyle;
    this.table = table;
    this.headerRowConfig = {
      height: new Control()
    };
  }
  
  print() {
    const cells = this.structure.map(structureItem => {
      let header = structureItem.label;
      if (structureItem.group) {
        header = ` ${header} `;

        const subHeader = new BaseHeader(structureItem.group, this.config[structureItem.key].group, this.customStyle, this.table).print();
        if (subHeader.trim().length > 0) {
          header += "\n" + subHeader;
        }
      }

      return this.table.createCell(
        {
          width: this.config[structureItem.key].width,
          height: this.headerRowConfig.height
        },
        structureItem.group ? this.removeWhitespace(header) : header
      ).style(this.customStyle);
    });

    return this.printRow(cells, this.headerRowConfig);
  }
  
  printRow(cells, config) {
    return "";
  }
  
  removeWhitespace(text) {
    // Ensure text is a string
    if (typeof text !== 'string') {
      text = String(text);
    }
    return text.replace(/^\s|\s$/gm, "");
  }
}

class BaseRow {
  constructor(item, structure, config, table) {
    this.item = item;
    this.structure = structure;
    this.config = config;
    this.table = table;
    this.cells = [];
    
    this.rowConfig = {
      height: new Control()
    };
    
    this.buildCells();
  }
  
  buildCells() {
    this.structure.forEach(structureItem => {
      const cellConfig = {
        width: this.config[structureItem.key].width,
        height: this.rowConfig.height
      };

      if (structureItem.group) {
        const value = this.item[structureItem.key];
        if (Array.isArray(value)) {
          const recursiveTable = new (this.table.constructor)(value, structureItem.group, this.config[structureItem.key].group, true);
          const recursiveOutput = recursiveTable.print();
          this.cells.push(
            this.table.createCell(
              cellConfig,
              this.removeWhitespace(recursiveOutput)
            )
          );
        } else if (value && typeof value === 'object') {
          const nestedCellValues = structureItem.group.map(groupItem => {
            let nestedValue = value[groupItem.key]; // Use key for extraction (data is transformed)
            if (nestedValue === undefined || nestedValue === null) {
              nestedValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (typeof nestedValue === "number") {
              nestedValue = `${nestedValue}`.padStart(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (Array.isArray(nestedValue)) {
              // Handle arrays like endpoints: ["users", "posts", "comments"] -> "users,posts,comments"
              nestedValue = nestedValue.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (groupItem.group && typeof nestedValue === 'object') {
              const deeplyNestedValues = groupItem.group.map(deepGroupItem => {
                let deepValue = nestedValue[deepGroupItem.key]; // Use key for extraction
                if (deepValue === undefined || deepValue === null) {
                  deepValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (typeof deepValue === "number") {
                  deepValue = `${deepValue}`.padStart(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (Array.isArray(deepValue)) {
                  deepValue = deepValue.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else {
                  deepValue = `${deepValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                }
                return deepValue;
              });
              nestedValue = deeplyNestedValues.join("  ");
            } else if (typeof nestedValue === 'object') {
              // If it's an object but no group structure is specified, show [object Object]
              nestedValue = "[object Object]".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else {
              nestedValue = `${nestedValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            }
            return nestedValue;
          });

          this.cells.push(
            this.table.createCell(
              cellConfig,
              nestedCellValues.join("  ")
            )
          );
        } else {
          this.cells.push(this.table.createCell(cellConfig, ""));
        }
      } else {
        this.cells.push(
          this.table.createCell(cellConfig, this.item[structureItem.key]).style(structureItem.style(structureItem.properties, this.item))
        );
      }
    });
  }
  
  print() {
    return this.printRow(this.cells, this.rowConfig);
  }
  
  printRow(cells, config) {
    return "";
  }
  
  removeWhitespace(text) {
    // Ensure text is a string
    if (typeof text !== 'string') {
      text = String(text);
    }
    return text.replace(/^\s|\s$/gm, "");
  }
}

class BaseCell {
  constructor(config, data) {
    this.config = config;
    this.data = data;
    this.customStyle = text => text;
    config.height.add(size(data));
  }

  shouldShowObjectAsPlaceholder(obj) {
    // If the object has nested objects or complex structures, show [object Object]
    // If it's a flat object with simple values, show the serialized content
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // Check if the object has any nested objects or arrays
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        return true; // Has nested complexity, show [object Object]
      }
    }

    // If all values are primitives, show serialized content
    return false;
  }

  style(style) {
    this.customStyle = style || (text => text);
    return this;
  }
  
  print() {
    let formattedValue = this.data;
    if (formattedValue === undefined || formattedValue === null) {
      formattedValue = "";
    } else if (moment.isDate(formattedValue)) {
      formattedValue = moment(formattedValue).format();
    } else if (typeof formattedValue === "boolean") {
      formattedValue = formattedValue ? "true" : "false";
    } else if (typeof formattedValue === "number") {
      formattedValue = `${formattedValue}`;
      formattedValue = formattedValue.padStart(this.config.width.value(), " ");
    } else if (Array.isArray(formattedValue)) {
      formattedValue = formattedValue.join("\n");
    } else if (typeof formattedValue === "object") {
      // Check if this is a simple object that should show [object Object] vs complex data that should be serialized
      if (this.shouldShowObjectAsPlaceholder(formattedValue)) {
        formattedValue = "[object Object]";
      } else {
        formattedValue = Object.entries(formattedValue)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
      }
    }

    return this.formatCell(formattedValue);
  }
  
  formatCell(formattedValue) {
    return [];
  }
  
  pad(value, length) {
    if (value === undefined || value === null) {
      return "".padEnd(length, " ");
    }
    if (typeof value === "number") {
      return `${value}`.padStart(length, " ");
    }
    if (Array.isArray(value)) {
      return value.map(item => this.pad(item, length));
    }
    return `${value}`.padEnd(length, " ");
  }
}

class BaseNestedHeaderRow {
  constructor(item, structure, config, table) {
    this.item = item;
    this.structure = structure;
    this.config = config;
    this.table = table;
    this.cells = [];
    
    this.rowConfig = {
      height: new Control()
    };
    
    this.buildCells();
  }
  
  buildCells() {
    this.structure.forEach(structureItem => {
      const cellConfig = {
        width: this.config[structureItem.key].width,
        height: this.rowConfig.height
      };

      if (structureItem.group && Array.isArray(this.item[structureItem.key])) {
        const nestedHeader = this.table.createHeader(structureItem.group, this.config[structureItem.key].group);
        this.cells.push(
          this.table.createCell(
            cellConfig,
            nestedHeader.print().replace(/^\s+|\s+$/gm, '')
          )
        );
      } else if (structureItem.group) {
        this.cells.push(this.table.createCell(cellConfig, ""));
      } else {
        this.cells.push(
          this.table.createCell(cellConfig, this.item[structureItem.key])
            .style(structureItem.style(structureItem.properties, this.item))
        );
      }
    });
  }
  
  print() {
    return this.printRow(this.cells, this.rowConfig);
  }
  
  printRow(cells, config) {
    return "";
  }
}

class BaseNestedDataRow {
  constructor(item, structure, config, arrayIndex, table) {
    this.item = item;
    this.structure = structure;
    this.config = config;
    this.arrayIndex = arrayIndex;
    this.table = table;
    this.cells = [];
    
    this.rowConfig = {
      height: new Control()
    };
    
    this.buildCells();
  }
  
  buildCells() {
    this.structure.forEach(structureItem => {
      const cellConfig = {
        width: this.config[structureItem.key].width,
        height: this.rowConfig.height
      };

      if (structureItem.group && Array.isArray(this.item[structureItem.key])) {
        const arrayValue = this.item[structureItem.key];
        if (this.arrayIndex < arrayValue.length) {
          const nestedItem = arrayValue[this.arrayIndex];
          const nestedCellValues = structureItem.group.map(groupItem => {
            let value = nestedItem[groupItem.key]; // Use key for extraction
            if (value === undefined || value === null) {
              value = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (typeof value === "number") {
              value = `${value}`.padStart(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (Array.isArray(value)) {
              value = value.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (groupItem.group && typeof value === 'object') {
              const deeplyNestedValues = groupItem.group.map(deepGroupItem => {
                let deepValue = value[deepGroupItem.key]; // Use key for extraction
                if (deepValue === undefined || deepValue === null) {
                  deepValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (typeof deepValue === "number") {
                  deepValue = `${deepValue}`.padStart(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (Array.isArray(deepValue)) {
                  deepValue = deepValue.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else {
                  deepValue = `${deepValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                }
                return deepValue;
              });
              value = deeplyNestedValues.join("  ");
            } else if (typeof value === 'object') {
              value = "[object Object]".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else {
              value = `${value}`.padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            }
            return value;
          });

          const finalValue = nestedCellValues.join("  ");
          this.cells.push(
            this.table.createCell(
              cellConfig,
              finalValue
            )
          );
        } else {
          this.cells.push(this.table.createCell(cellConfig, ""));
        }
      } else {
        // For non-array fields, check if this structure item has any nested arrays that need to be processed for this arrayIndex
        const hasNestedArraysForThisIndex = structureItem.group && structureItem.group.some(groupItem => {
          const value = this.item[structureItem.key];
          if (!value) return false;
          const nestedValue = value[groupItem.key];
          return Array.isArray(nestedValue) && this.arrayIndex < nestedValue.length;
        });

        if (this.arrayIndex === 0 || hasNestedArraysForThisIndex) {
          if (structureItem.group) {
            const value = this.item[structureItem.key];
            // console.error(`DEBUG: BaseNestedDataRow non-array field ${structureItem.key}, value type=${typeof value}, isArray=${Array.isArray(value)}`);
            // if (Array.isArray(value)) {
            //   console.error(`DEBUG: Found array in non-array processing: ${structureItem.key}`, JSON.stringify(value));
            // }
            // Handle non-array nested objects similar to BaseRow
            if (value && typeof value === 'object') {
              const nestedCellValues = structureItem.group.map(groupItem => {
                let nestedValue = value[groupItem.key];

                // For non-array values, only show in first iteration unless this is needed for alignment
                if (!Array.isArray(nestedValue) && this.arrayIndex > 0) {
                  return "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                }

                if (nestedValue === undefined || nestedValue === null) {
                  nestedValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                } else if (typeof nestedValue === "number") {
                  nestedValue = `${nestedValue}`.padStart(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                } else if (Array.isArray(nestedValue)) {
                  if (groupItem.group) {
                    // Array with structure - show only the current arrayIndex item
                    if (this.arrayIndex < nestedValue.length) {
                      const currentItem = nestedValue[this.arrayIndex];
                      const recursiveTable = new (this.table.constructor)([currentItem], groupItem.group, this.config[structureItem.key].group[groupItem.key].group, false);
                      let rawOutput = this.table.removeWhitespace ? this.table.removeWhitespace(recursiveTable.print()) : recursiveTable.print().trim();
                      // Remove any extra padding and re-pad to exact width
                      nestedValue = rawOutput.replace(/\s+$/, '').padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                    } else {
                      nestedValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                    }
                  } else {
                    // Simple array - join with commas
                    nestedValue = nestedValue.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                  }
                } else if (groupItem.group && typeof nestedValue === 'object') {
                  const deeplyNestedValues = groupItem.group.map(deepGroupItem => {
                    let deepValue = nestedValue[deepGroupItem.key];
                    if (deepValue === undefined || deepValue === null) {
                      deepValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                    } else if (typeof deepValue === "number") {
                      deepValue = `${deepValue}`.padStart(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                    } else if (Array.isArray(deepValue)) {
                      deepValue = deepValue.join(",").padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                    } else {
                      deepValue = `${deepValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                    }
                    return deepValue;
                  });
                  nestedValue = deeplyNestedValues.join("  ");
                } else if (typeof nestedValue === 'object') {
                  nestedValue = "[object Object]".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                } else {
                  nestedValue = `${nestedValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
                }
                return nestedValue;
              });

              this.cells.push(
                this.table.createCell(
                  cellConfig,
                  nestedCellValues.join("  ")
                )
              );
            } else {
              this.cells.push(this.table.createCell(cellConfig, ""));
            }
          } else {
            this.cells.push(
              this.table.createCell(cellConfig, this.item[structureItem.key])
                .style(structureItem.style(structureItem.properties, this.item))
            );
          }
        } else {
          this.cells.push(this.table.createCell(cellConfig, ""));
        }
      }
    });
  }
  
  print() {
    return this.printRow(this.cells, this.rowConfig);
  }
  
  printRow(cells, config) {
    return "";
  }
}

class BaseGlobalNestedHeaderRow {
  constructor(structure, config, table) {
    this.structure = structure;
    this.config = config;
    this.table = table;
    this.cells = [];
    
    this.rowConfig = {
      height: new Control()
    };
    
    this.buildCells();
  }
  
  buildCells() {
    this.structure.forEach(structureItem => {
      const cellConfig = {
        width: this.config[structureItem.key].width,
        height: this.rowConfig.height
      };

      if (structureItem.group) {
        const nestedHeader = this.table.createHeader(structureItem.group, this.config[structureItem.key].group);
        this.cells.push(
          this.table.createCell(
            cellConfig,
            nestedHeader.print().replace(/^\s+|\s+$/gm, '')
          )
        );
      } else {
        this.cells.push(this.table.createCell(cellConfig, ""));
      }
    });
  }
  
  print() {
    const result = this.printRow(this.cells, this.rowConfig);
    return result.replace(/\s+((?:\x1b\[[0-9;]*m)*)$/, '$1');
  }
  
  printRow(cells, config) {
    return "";
  }
}

class BaseNestedHeaderRowAtLevel {
  constructor(structure, config, level, table) {
    this.structure = structure;
    this.config = config;
    this.level = level;
    this.table = table;
    this.cells = [];
    
    this.rowConfig = {
      height: new Control()
    };
    
    this.buildCells();
  }
  
  buildCells() {
    this.structure.forEach(structureItem => {
      const cellConfig = {
        width: this.config[structureItem.key].width,
        height: this.rowConfig.height
      };

      const headerText = this.getHeaderTextAtLevel(structureItem, this.level);
      this.cells.push(this.table.createCell(cellConfig, headerText));
    });
  }
  
  getHeaderTextAtLevel(structureItem, level) {
    if (!structureItem.group) {
      return "";
    }
    
    if (level === 1) {
      return structureItem.group.map(groupItem => {
        const width = this.config[structureItem.key].group[groupItem.key].width.value();
        // console.error(`DEBUG: Header ${groupItem.label} width: ${width}`);
        return groupItem.label.padEnd(width, " ");
      }).join("  ");
    } else {
      return structureItem.group.map(groupItem => {
        if (groupItem.group && level === 2) {
          return groupItem.group.map(deepGroupItem => {
            const width = this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value();
            return deepGroupItem.label.padEnd(width, " ");
          }).join("  ");
        } else {
          const width = this.config[structureItem.key].group[groupItem.key].width.value();
          return "".padEnd(width, " ");
        }
      }).join("  ");
    }
  }
  
  print() {
    return this.printRow(this.cells, this.rowConfig);
  }
  
  printRow(cells, config) {
    return "";
  }
}

class InvalidLineRow {
  constructor(invalidItem, structure, config, table) {
    this.invalidItem = invalidItem;
    this.structure = structure;
    this.config = config;
    this.table = table;
  }

  print() {
    const cells = [];

    this.structure.forEach(structureItem => {
      const cellConfig = this.config[structureItem.key];

      if (structureItem.key === '__lineNumber__') {
        // Line number cell
        const lineNumber = String(this.invalidItem.lineNumber);
        const width = cellConfig?.width?.value() || lineNumber.length;
        const paddedLineNumber = lineNumber.padStart(width, ' ');
        cells.push(paddedLineNumber);
      } else {
        // Data cell - show <invalid line> for first column, empty for others
        const isFirstDataColumn = this.structure.findIndex(s => s.key !== '__lineNumber__') ===
                                   this.structure.findIndex(s => s.key === structureItem.key);

        if (isFirstDataColumn) {
          const invalidText = colors.red('<invalid line>');
          const width = cellConfig?.width?.value() || '<invalid line>'.length;
          const paddedText = invalidText.padEnd(width, ' ');
          cells.push(paddedText);
        } else {
          const width = cellConfig?.width?.value() || 1;
          cells.push(' '.repeat(width));
        }
      }
    });

    return ' ' + cells.join('  ') + ' ';
  }
}

export { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow, BaseNestedHeaderRowAtLevel, InvalidLineRow };