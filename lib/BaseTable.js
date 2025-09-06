import moment from "moment";
import { Config, Control } from "./Config.js";
import { size } from "./Utils.js";

class BaseTable {
  constructor(data, structure, configuration, includeHeaders = true) {
    this.data = data;
    this.structure = structure;
    this.config = configuration || new Config(structure);
    this.includeHeaders = includeHeaders;
    this.rows = [];
    
    this.buildTable();
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

    this.data.forEach(item => {
      const rowsForItem = this.createRowsForItem(item, this.structure, this.config);
      rowsForItem.forEach(row => this.rows.push(row));
    });
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
          this.cells.push(
            this.table.createCell(
              cellConfig,
              this.removeWhitespace(new (this.table.constructor)(value, structureItem.group, this.config[structureItem.key].group, true).print())
            )
          );
        } else if (value && typeof value === 'object') {
          const nestedCellValues = structureItem.group.map(groupItem => {
            let nestedValue = value[groupItem.key];
            if (nestedValue === undefined || nestedValue === null) {
              nestedValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (typeof nestedValue === "number") {
              nestedValue = `${nestedValue}`.padStart(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (groupItem.group && typeof nestedValue === 'object') {
              const deeplyNestedValues = groupItem.group.map(deepGroupItem => {
                let deepValue = nestedValue[deepGroupItem.key];
                if (deepValue === undefined || deepValue === null) {
                  deepValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (typeof deepValue === "number") {
                  deepValue = `${deepValue}`.padStart(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else {
                  deepValue = `${deepValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                }
                return deepValue;
              });
              nestedValue = deeplyNestedValues.join("  ");
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
      formattedValue = Object.entries(formattedValue)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
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
            let value = nestedItem[groupItem.key];
            if (value === undefined || value === null) {
              value = "".padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (typeof value === "number") {
              value = `${value}`.padStart(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            } else if (groupItem.group && typeof value === 'object') {
              const deeplyNestedValues = groupItem.group.map(deepGroupItem => {
                let deepValue = value[deepGroupItem.key];
                if (deepValue === undefined || deepValue === null) {
                  deepValue = "".padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else if (typeof deepValue === "number") {
                  deepValue = `${deepValue}`.padStart(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                } else {
                  deepValue = `${deepValue}`.padEnd(this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value(), " ");
                }
                return deepValue;
              });
              value = deeplyNestedValues.join("  ");
            } else {
              value = `${value}`.padEnd(this.config[structureItem.key].group[groupItem.key].width.value(), " ");
            }
            return value;
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
        if (this.arrayIndex === 0) {
          this.cells.push(
            this.table.createCell(cellConfig, this.item[structureItem.key])
              .style(structureItem.style(structureItem.properties, this.item))
          );
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

export { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow, BaseNestedHeaderRowAtLevel };