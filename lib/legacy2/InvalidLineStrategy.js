/**
 * Invalid line handling strategies using Strategy pattern
 * Manages integration of invalid line placeholders with valid data
 */

export class InvalidLineStrategy {
  static getStrategy(showInvalidLines) {
    if (showInvalidLines) {
      return new ShowInvalidLinesStrategy();
    }
    return new HideInvalidLinesStrategy();
  }

  static processData(data, invalidLines, showInvalidLines, lineNumbers, wrapperData = null) {
    const strategy = this.getStrategy(showInvalidLines);
    return strategy.processData(data, invalidLines, lineNumbers, wrapperData);
  }

  static processStructure(structure, data, invalidLines, showInvalidLines, lineNumbers, wrapperData = null) {
    const strategy = this.getStrategy(showInvalidLines);
    return strategy.processStructure(structure, data, invalidLines, lineNumbers, wrapperData);
  }
}

class HideInvalidLinesStrategy {
  processData(data, invalidLines, lineNumbers, wrapperData) {
    // When not showing invalid lines, just handle line numbers normally
    if (lineNumbers && wrapperData) {
      return data.map((item, index) => {
        const lineNum = wrapperData[index] ? wrapperData[index].lineNumber : index + 1;
        return {
          '__lineNumber__': lineNum,
          ...item
        };
      });
    }
    return data;
  }

  processStructure(structure, data, invalidLines, lineNumbers, wrapperData) {
    if (lineNumbers) {
      // Calculate max line number from wrapperData if available
      let maxLineNumber = data.length;
      if (wrapperData && wrapperData.length > 0) {
        maxLineNumber = Math.max(...wrapperData.map(wrapper => wrapper.lineNumber));
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
    return structure;
  }
}

class ShowInvalidLinesStrategy {
  processData(data, invalidLines, lineNumbers, wrapperData) {
    // Create a merged array with invalid line placeholders
    const allLines = [];
    const invalidLineMap = new Map(invalidLines.map(inv => [inv.lineNumber, inv]));

    // Find the maximum line number to know the range
    const maxValidLine = wrapperData && wrapperData.length > 0 ?
      Math.max(...wrapperData.map(w => w.lineNumber)) : data.length;
    const maxInvalidLine = invalidLines.length > 0 ?
      Math.max(...invalidLines.map(inv => inv.lineNumber)) : 0;
    const maxLine = Math.max(maxValidLine, maxInvalidLine);

    // Build the combined array with both valid and invalid lines
    let validDataIndex = 0;
    for (let lineNum = 1; lineNum <= maxLine; lineNum++) {
      if (invalidLineMap.has(lineNum)) {
        // This is an invalid line
        const invalidEntry = {
          '__isInvalidLine__': true,
          '__lineNumber__': lineNumbers ? lineNum : undefined
        };

        // Add placeholder values for all structure fields
        // We'll determine the actual field names from the structure
        allLines.push(invalidEntry);
      } else if (validDataIndex < data.length) {
        // This is a valid line
        const item = data[validDataIndex];
        const processedItem = {
          '__lineNumber__': lineNumbers ? lineNum : undefined,
          ...item
        };
        allLines.push(processedItem);
        validDataIndex++;
      }
    }

    return allLines;
  }

  processStructure(structure, data, invalidLines, lineNumbers, wrapperData) {
    let processedStructure = [...structure];

    if (lineNumbers) {
      // Find the maximum line number for width calculation
      const maxValidLine = wrapperData && wrapperData.length > 0 ?
        Math.max(...wrapperData.map(w => w.lineNumber)) : data.length;
      const maxInvalidLine = invalidLines.length > 0 ?
        Math.max(...invalidLines.map(inv => inv.lineNumber)) : 0;
      const maxLine = Math.max(maxValidLine, maxInvalidLine);

      const lineNumberColumn = {
        field: '__lineNumber__',
        key: '__lineNumber__',
        label: '#',
        group: null,
        properties: {}
      };

      processedStructure = [lineNumberColumn, ...structure];
    }

    return processedStructure;
  }
}