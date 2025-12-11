import { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow, BaseNestedHeaderRowAtLevel } from "./BaseTable.js";

class MarkdownTable extends BaseTable {
  getHeaderStyle() {
    return text => text;
  }
  
  createHeader(structure, config) {
    return new MarkdownHeader(structure, config, this.getHeaderStyle(), this);
  }
  
  createRow(item, structure, config) {
    return new MarkdownRow(item, structure, config, this);
  }
  
  createCell(config, data) {
    return new MarkdownCell(config, data);
  }
  
  createNestedHeaderRow(item, structure, config) {
    return new MarkdownNestedHeaderRow(item, structure, config, this);
  }
  
  createNestedDataRow(item, structure, config, arrayIndex) {
    return new MarkdownNestedDataRow(item, structure, config, arrayIndex, this);
  }
  
  createGlobalNestedHeaderRow(structure, config) {
    return new MarkdownGlobalNestedHeaderRow(structure, config, this);
  }
  
  createNestedHeaderRowAtLevel(structure, config, level) {
    return new MarkdownNestedHeaderRowAtLevel(structure, config, level, this);
  }
  
  print() {
    if (this.rows.length === 0) {
      return "";
    }
    
    const headerRow = this.rows[0];
    const dataRows = this.rows.slice(1);
    
    const headerLine = headerRow.print();
    const separatorLine = this.createSeparatorLine();
    const dataLines = dataRows.map(row => row.print()).filter(line => line.length > 0).join("\n");
    
    return [headerLine, separatorLine, dataLines].filter(line => line.length > 0).join("\n");
  }
  
  createSeparatorLine() {
    const separators = this.getFlattenedColumnCount().map(() => "---");
    return `| ${separators.join(" | ")} |`;
  }
  
  getFlattenedColumnCount() {
    const columns = [];
    this.structure.forEach(structureItem => {
      if (structureItem.group) {
        structureItem.group.forEach(() => columns.push("---"));
      } else {
        columns.push("---");
      }
    });
    return columns;
  }
}

class MarkdownHeader extends BaseHeader {
  printRow(cells, config) {
    const flattenedCells = this.flattenHeaderCells(cells);
    return `| ${flattenedCells.join(" | ")} |`;
  }
  
  flattenHeaderCells(cells) {
    const flattenedCells = [];
    
    for (let i = 0; i < this.structure.length; i++) {
      const structureItem = this.structure[i];
      const cell = cells[i];
      const cellLines = cell.print();
      const cellContent = cellLines.length > 0 ? cellLines[0].trim() : "";
      
      if (structureItem.group) {
        const childCount = structureItem.group.length;
        flattenedCells.push(cellContent);
        for (let j = 1; j < childCount; j++) {
          flattenedCells.push("");
        }
      } else {
        flattenedCells.push(cellContent);
      }
    }
    
    return flattenedCells;
  }
}

class MarkdownRow extends BaseRow {
  printRow(cells, config) {
    const flattenedCells = this.flattenDataCells(cells);
    return `| ${flattenedCells.join(" | ")} |`;
  }
  
  flattenDataCells(cells) {
    const flattenedCells = [];
    
    for (let i = 0; i < this.structure.length; i++) {
      const structureItem = this.structure[i];
      const cell = cells[i];
      const cellLines = cell.print();
      const cellContent = cellLines.length > 0 ? cellLines[0].trim() : "";
      
      if (structureItem.group) {
        const value = this.item[structureItem.key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          structureItem.group.forEach(groupItem => {
            const nestedValue = value[groupItem.key];
            flattenedCells.push(nestedValue !== undefined && nestedValue !== null ? String(nestedValue) : "");
          });
        } else {
          structureItem.group.forEach(() => {
            flattenedCells.push("");
          });
        }
      } else {
        flattenedCells.push(cellContent);
      }
    }
    
    return flattenedCells;
  }
}

class MarkdownCell extends BaseCell {
  formatCell(formattedValue) {
    // Ensure formattedValue is a string
    if (typeof formattedValue !== 'string') {
      formattedValue = String(formattedValue);
    }
    const cleanValue = formattedValue.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
    return [cleanValue];
  }
}

class MarkdownNestedHeaderRow extends BaseNestedHeaderRow {
  printRow(cells, config) {
    const cellValues = cells.map(cell => {
      const cellLines = cell.print();
      return cellLines.length > 0 ? cellLines[0].trim() : "";
    });
    
    return `| ${cellValues.join(" | ")} |`;
  }
}

class MarkdownNestedDataRow extends BaseNestedDataRow {
  printRow(cells, config) {
    const flattenedCells = this.flattenNestedDataCells(cells);
    return `| ${flattenedCells.join(" | ")} |`;
  }
  
  flattenNestedDataCells(cells) {
    const flattenedCells = [];
    
    for (let i = 0; i < this.structure.length; i++) {
      const structureItem = this.structure[i];
      
      if (structureItem.group && Array.isArray(this.item[structureItem.key])) {
        const arrayValue = this.item[structureItem.key];
        if (this.arrayIndex < arrayValue.length) {
          const nestedItem = arrayValue[this.arrayIndex];
          structureItem.group.forEach(groupItem => {
            const value = nestedItem[groupItem.key];
            flattenedCells.push(value !== undefined && value !== null ? String(value) : "");
          });
        } else {
          structureItem.group.forEach(() => {
            flattenedCells.push("");
          });
        }
      } else if (structureItem.group) {
        structureItem.group.forEach(() => {
          flattenedCells.push("");
        });
      } else {
        if (this.arrayIndex === 0) {
          const cell = cells[i];
          const cellLines = cell.print();
          const cellContent = cellLines.length > 0 ? cellLines[0].trim() : "";
          flattenedCells.push(cellContent);
        } else {
          flattenedCells.push("");
        }
      }
    }
    
    return flattenedCells;
  }
}

class MarkdownGlobalNestedHeaderRow extends BaseGlobalNestedHeaderRow {
  printRow(cells, config) {
    const cellValues = cells.map(cell => {
      const cellLines = cell.print();
      return cellLines.length > 0 ? cellLines[0].trim() : "";
    });
    
    return `| ${cellValues.join(" | ")} |`;
  }
}

class MarkdownNestedHeaderRowAtLevel extends BaseNestedHeaderRowAtLevel {
  printRow(cells, config) {
    const flattenedCells = this.flattenNestedHeaderCells(cells);
    return `| ${flattenedCells.join(" | ")} |`;
  }
  
  flattenNestedHeaderCells(cells) {
    const flattenedCells = [];
    
    for (let i = 0; i < this.structure.length; i++) {
      const structureItem = this.structure[i];
      
      if (structureItem.group && this.level === 1) {
        structureItem.group.forEach(groupItem => {
          flattenedCells.push(groupItem.label);
        });
      } else if (structureItem.group) {
        const childCount = structureItem.group.length;
        for (let j = 0; j < childCount; j++) {
          flattenedCells.push("");
        }
      } else {
        flattenedCells.push("");
      }
    }
    
    return flattenedCells;
  }
}

export { MarkdownTable };