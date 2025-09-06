const colors = require("colors");
const { BaseTable, BaseHeader, BaseRow, BaseCell, BaseNestedHeaderRow, BaseNestedDataRow, BaseGlobalNestedHeaderRow, BaseNestedHeaderRowAtLevel } = require("./BaseTable");

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
    const output = this.rows
      .map(row => row.print())
      .filter(row => row.length > 0)
      .join(this.getRowSeparator());
    
    // Remove trailing spaces from each line as the final step, handling ANSI codes
    return output.split('\n').map(line => this.trimLineEnd(line)).join('\n');
  }
  
  trimLineEnd(line) {
    // Strip ANSI codes to check for trailing spaces
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    const trimmedPlain = plainLine.trimEnd();
    
    // If no trailing spaces, return as is
    if (plainLine.length === trimmedPlain.length) {
      return line;
    }
    
    // Remove trailing spaces from original line by removing the same number of characters
    const spacesToRemove = plainLine.length - trimmedPlain.length;
    let result = line;
    let removed = 0;
    
    // Work backwards removing spaces
    while (removed < spacesToRemove && result.length > 0) {
      if (result.endsWith(' ')) {
        result = result.slice(0, -1);
        removed++;
      } else if (/\x1b\[[0-9;]*m$/.test(result)) {
        // If line ends with ANSI code, look for spaces before it
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

module.exports = { AsciiTable };