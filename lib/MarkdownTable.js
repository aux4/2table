const { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow } = require("./BaseTable");

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
    const separators = this.structure.map(() => "---");
    return `| ${separators.join(" | ")} |`;
  }
}

class MarkdownHeader extends BaseHeader {
  printRow(cells, config) {
    const cellValues = cells.map(cell => {
      const cellLines = cell.print();
      return cellLines.length > 0 ? cellLines[0].trim() : "";
    });
    
    return `| ${cellValues.join(" | ")} |`;
  }
}

class MarkdownRow extends BaseRow {
  printRow(cells, config) {
    const cellValues = cells.map(cell => {
      const cellLines = cell.print();
      return cellLines.length > 0 ? cellLines[0].trim() : "";
    });
    
    return `| ${cellValues.join(" | ")} |`;
  }
}

class MarkdownCell extends BaseCell {
  formatCell(formattedValue) {
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
    const cellValues = cells.map(cell => {
      const cellLines = cell.print();
      return cellLines.length > 0 ? cellLines[0].trim() : "";
    });
    
    return `| ${cellValues.join(" | ")} |`;
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

module.exports = { MarkdownTable };