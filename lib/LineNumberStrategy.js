/**
 * Line number handling strategies using Strategy pattern
 * Eliminates conditional logic for line number processing
 */

export class LineNumberStrategy {
  static getStrategy(lineNumbers) {
    if (lineNumbers) {
      return new EnabledLineNumberStrategy();
    }
    return new DisabledLineNumberStrategy();
  }

  static processData(data, lineNumbers, wrapperData = null) {
    const strategy = this.getStrategy(lineNumbers);
    return strategy.processData(data, wrapperData);
  }

  static processStructure(structure, lineNumbers, dataLength, wrapperData = null) {
    const strategy = this.getStrategy(lineNumbers);
    return strategy.processStructure(structure, dataLength, wrapperData);
  }
}

class DisabledLineNumberStrategy {
  processData(data, wrapperData) {
    // No modification needed when line numbers are disabled
    return data;
  }

  processStructure(structure, dataLength, wrapperData) {
    // No modification needed when line numbers are disabled
    return structure;
  }
}

class EnabledLineNumberStrategy {
  processData(data, wrapperData) {
    // Add line numbers to data items
    return data.map((item, index) => {
      let lineNum = index + 1; // Default sequential numbering

      if (wrapperData && wrapperData[index]) {
        lineNum = wrapperData[index].lineNumber;
      }

      return {
        '__lineNumber__': lineNum,
        ...item
      };
    });
  }

  processStructure(structure, dataLength, wrapperData) {
    // Calculate the width needed for line numbers
    let maxLineNumber = dataLength;

    if (wrapperData && wrapperData.length > 0) {
      maxLineNumber = Math.max(...wrapperData.map(wrapper => wrapper.lineNumber));
    }

    const lineNumberWidth = Math.max(1, String(maxLineNumber).length);

    // Create the line number column structure - use simple '#' label
    const lineNumberColumn = {
      field: '__lineNumber__',
      key: '__lineNumber__',
      label: '#',
      group: null,
      properties: {}
    };

    return [lineNumberColumn, ...structure];
  }
}