import colors from "colors";
import { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow, BaseNestedHeaderRowAtLevel } from "./BaseTable.js";

class AsciiTable extends BaseTable {
  getHeaderStyle() {
    return text => text.bold.yellow;
  }
  
  createHeader(structure, config) {
    return new AsciiHeader(structure, config, this.getHeaderStyle(), this);
  }
  
  createRow(item, structure, config) {
    return new AsciiRow(item, structure, config, this);
  }
  
  createCell(config, data) {
    return new AsciiCell(config, data);
  }
  
  createNestedHeaderRow(item, structure, config) {
    return new AsciiNestedHeaderRow(item, structure, config, this);
  }
  
  createNestedDataRow(item, structure, config, arrayIndex) {
    return new AsciiNestedDataRow(item, structure, config, arrayIndex, this);
  }
  
  createGlobalNestedHeaderRow(structure, config) {
    return new AsciiGlobalNestedHeaderRow(structure, config, this);
  }
  
  createNestedHeaderRowAtLevel(structure, config, level) {
    return new AsciiNestedHeaderRowAtLevel(structure, config, level, this);
  }
  
  print() {
    const printedRows = this.rows.map(row => row.print());

    const output = printedRows
      .filter(row => row.length > 0)
      .join(this.getRowSeparator());

    return output.split('\n').map(line => this.trimLineEnd(line)).join('\n');
  }
  
  trimLineEnd(line) {
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    const trimmedPlain = plainLine.trimEnd();
    
    if (plainLine.length === trimmedPlain.length) {
      return line;
    }
    
    const spacesToRemove = plainLine.length - trimmedPlain.length;
    let result = line;
    let removed = 0;
    
    while (removed < spacesToRemove && result.length > 0) {
      if (result.endsWith(' ')) {
        result = result.slice(0, -1);
        removed++;
      } else if (/\x1b\[[0-9;]*m$/.test(result)) {
        const beforeAnsi = result.replace(/(\x1b\[[0-9;]*m)+$/, '');
        if (beforeAnsi.endsWith(' ')) {
          const ansiCodes = result.slice(beforeAnsi.length);
          result = beforeAnsi.slice(0, -1) + ansiCodes;
          removed++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return result;
  }
}

class AsciiHeader extends BaseHeader {
  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

class AsciiRow extends BaseRow {
  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

class AsciiCell extends BaseCell {
  formatCell(formattedValue) {
    const lines = formattedValue.split("\n");

    while (lines.length < this.config.height.value()) {
      lines.push("");
    }

    return lines
      .map(line => this.pad(line, this.config.width.value()))
      .map(line => this.customStyle(line))
      .map(line => {
        return ` ${line} `;
      });
  }
}

class AsciiNestedHeaderRow extends BaseNestedHeaderRow {
  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

class AsciiNestedDataRow extends BaseNestedDataRow {
  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

class AsciiGlobalNestedHeaderRow extends BaseGlobalNestedHeaderRow {
  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

class AsciiNestedHeaderRowAtLevel extends BaseNestedHeaderRowAtLevel {
  getHeaderTextAtLevel(structureItem, level) {
    if (!structureItem.group) {
      return "";
    }
    
    const headerStyle = this.table.getHeaderStyle();
    
    if (level === 1) {
      return structureItem.group.map(groupItem => {
        const width = this.config[structureItem.key].group[groupItem.key].width.value();
        return headerStyle(groupItem.label.padEnd(width, " "));
      }).join("  ");
    } else {
      return structureItem.group.map(groupItem => {
        if (groupItem.group && level === 2) {
          return groupItem.group.map(deepGroupItem => {
            const width = this.config[structureItem.key].group[groupItem.key].group[deepGroupItem.key].width.value();
            return headerStyle(deepGroupItem.label.padEnd(width, " "));
          }).join("  ");
        } else {
          const width = this.config[structureItem.key].group[groupItem.key].width.value();
          return "".padEnd(width, " ");
        }
      }).join("  ");
    }
  }

  printRow(cells, config) {
    const cellLines = cells.map(cell => cell.print());

    let text = "";

    for (let i = 0; i < config.height.value(); i++) {
      if (i > 0) text += "\n";
      cellLines.forEach(cell => {
        text += cell[i];
      });
    }

    if (text.trim().length === 0) {
      text = "";
    }

    return text;
  }
}

export { AsciiTable };