import { length, removeNonAnsiCharacters } from "./Utils.js";
import { Control } from "./Config.js";

function prepareData(data, structure, config) {
  let transformedData;
  if (Array.isArray(data)) {
    transformedData = data.map(item => transform(item, structure, config));
  } else {
    transformedData = [transform(data, structure, config)];
  }

  // After all data is transformed and widths calculated, fix parent widths
  if (config) {
    updateParentWidths(structure, config, Array.isArray(data) ? data[0] : data);
  }

  return transformedData;
}

function transform(data, structure, config) {
  if (data === undefined || data === null) return data;

  const item = {};
  structure.forEach(structureItem => {
    const value = structureItem.field.includes('.') ? 
      structureItem.extractor(data) : 
      structureItem.extractor(data[structureItem.field]);

    if (structureItem.group) {
      const groupConfig = config ? config[structureItem.key].group : null;
      if (Array.isArray(value)) {
        item[structureItem.key] = value.map(valueItem => transform(valueItem, structureItem.group, groupConfig));
      } else {
        item[structureItem.key] = transform(value, structureItem.group, groupConfig);
      }
    } else {
      item[structureItem.key] = value;
    }

    if (structureItem.properties.width) {
      if (typeof item[structureItem.key] === "string") {
        item[structureItem.key] = limitWidth(
          item[structureItem.key],
          structureItem.properties.width,
          structureItem.properties.truncate
        );
      } else if (Array.isArray(item[structureItem.key]) && typeof item[structureItem.key][0] === "string") {
        item[structureItem.key] = item[structureItem.key].map(item =>
          limitWidth(item, structureItem.properties.width, structureItem.properties.truncate)
        );
      }
    }

    if (config) {
      const actualDisplayWidth = calculateActualDisplayWidth(item[structureItem.key], structureItem, config[structureItem.key]);
      // console.error(`DEBUG: Adding width ${actualDisplayWidth} to ${structureItem.key}`);
      config[structureItem.key].width.add(actualDisplayWidth);
    }
  });
  return item;
}

function limitWidth(text, width, truncate) {
  // Ensure text is a string
  if (typeof text !== 'string') {
    text = String(text);
  }

  if (text.length <= width) {
    return text;
  }

  if (truncate === "true") {
    return text.substring(0, width - 3) + "...";
  }

  const brokenWords = breakWords(text, width);
  // Ensure brokenWords is a string before calling replace
  if (typeof brokenWords !== 'string') {
    return String(brokenWords);
  }

  return brokenWords.replace(/\n\s/g, "\n").replace(/\n$/, "");
}

function breakWords(text, width) {
  // Ensure text is a string
  if (typeof text !== 'string') {
    text = String(text);
  }

  let whitespacePosition = 0;
  let lastBreak = 0;
  let breakWordText = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i].match(/\W/)) {
      whitespacePosition = i;
    }

    if (i > 0 && (i - lastBreak) % width === 0) {
      const lastPosition = whitespacePosition > lastBreak ? whitespacePosition : i;
      breakWordText += text.substring(lastBreak, lastPosition).trim() + "\n";
      lastBreak = lastPosition;
      i = lastPosition + 1;
    }
  }

  breakWordText += text.substring(lastBreak, text.length).trim();

  return breakWordText;
}

function calculateActualDisplayWidth(value, structureItem, configItem) {
  if (!structureItem.group) {
    // Non-grouped items: calculate based on how they'll actually be rendered
    if (Array.isArray(value)) {
      // Arrays are rendered as comma-separated strings
      const renderedString = value.join(",");
      const calculatedLength = removeNonAnsiCharacters(renderedString).length;
      // console.error(`DEBUG: calculateActualDisplayWidth for ${structureItem.key}: array value=${JSON.stringify(value)}, rendered="${renderedString}", length=${calculatedLength}`);
      return calculatedLength;
    } else {
      const calculatedLength = length(value, null);
      // console.error(`DEBUG: calculateActualDisplayWidth for ${structureItem.key}: value=${JSON.stringify(value)}, length=${calculatedLength}`);
      return calculatedLength;
    }
  }

  // Grouped items: simulate what BaseRow will render
  if (Array.isArray(value)) {
    // For arrays with groups, calculate max width of individual items (not entire table)
    let maxItemWidth = 0;
    value.forEach(item => {
      const renderedParts = structureItem.group.map(groupItem => {
        let nestedValue = item[groupItem.key];
        const fieldWidth = configItem.group[groupItem.key].width.value();

        if (nestedValue === undefined || nestedValue === null) {
          return "".padEnd(fieldWidth, " ");
        } else if (typeof nestedValue === "number") {
          return `${nestedValue}`.padStart(fieldWidth, " ");
        } else if (Array.isArray(nestedValue)) {
          return nestedValue.join(",").padEnd(fieldWidth, " ");
        } else if (groupItem.group && typeof nestedValue === 'object') {
          // Recursively handle deeply nested structures
          return calculateActualDisplayWidth(nestedValue, groupItem, configItem.group[groupItem.key]);
        } else if (typeof nestedValue === 'object') {
          return "[object Object]".padEnd(fieldWidth, " ");
        } else {
          return `${nestedValue}`.padEnd(fieldWidth, " ");
        }
      });
      // Join with "  " (2 spaces) as BaseRow does
      const renderedString = renderedParts.join("  ");
      const itemWidth = removeNonAnsiCharacters(renderedString).length;
      maxItemWidth = Math.max(maxItemWidth, itemWidth);
    });
    return maxItemWidth;
  } else if (value && typeof value === 'object') {
    // For objects, simulate the concatenated primitive values that BaseRow produces
    const renderedParts = structureItem.group.map(groupItem => {
      let nestedValue = value[groupItem.key];
      if (nestedValue === undefined || nestedValue === null) {
        return "";
      } else if (typeof nestedValue === "number") {
        return `${nestedValue}`;
      } else if (Array.isArray(nestedValue)) {
        return nestedValue.join(",");
      } else if (groupItem.group && typeof nestedValue === 'object') {
        // Recursively handle deeply nested structures
        return calculateActualDisplayWidth(nestedValue, groupItem, configItem.group[groupItem.key]);
      } else if (typeof nestedValue === 'object') {
        return "[object Object]";
      } else {
        return `${nestedValue}`;
      }
    });

    // Join with "  " (2 spaces) as BaseRow does
    const renderedString = renderedParts.join("  ");
    return removeNonAnsiCharacters(renderedString).length;
  }

  return 0;
}

function updateParentWidths(structure, config, dataItem = null) {
  structure.forEach(structureItem => {
    if (structureItem.group) {
      // First, recursively update any nested parent widths
      const fieldName = structureItem.field || structureItem.key.split(':').pop();
      const nestedDataItem = dataItem ? dataItem[fieldName] : null;
      updateParentWidths(structureItem.group, config[structureItem.key].group, nestedDataItem);

      // Then calculate this parent's width as sum of children widths + spacing
      let totalChildWidth = 0;
      structureItem.group.forEach((childItem, index) => {
        let childWidth = config[structureItem.key].group[childItem.key].width.value();

        // For array children, the actual rendered width might be different from the calculated width
        // because arrays are rendered row-by-row, not as side-by-side columns
        if (childItem.group) {
          // This child has its own structure (like dependencies[name,version])
          // We need to ensure the width accounts for actual rendering, not just header layout
          // The width should have already been correctly calculated in calculateActualDisplayWidth
          // but let's make sure it's not being overridden by header calculations
        }

        totalChildWidth += childWidth;
        if (index < structureItem.group.length - 1) {
          totalChildWidth += 2; // Add 2 spaces between columns
        }
      });

      // Skip width update for array fields - their width is already correctly calculated
      const checkFieldName = structureItem.field || structureItem.key.split(':').pop();
      const currentFieldData = dataItem ? dataItem[checkFieldName] : null;
      const isArrayField = Array.isArray(currentFieldData);
      if (!isArrayField) {
        // Set parent width to be at least the sum of children
        const currentParentWidth = config[structureItem.key].width.value();
        if (totalChildWidth > currentParentWidth) {
          // Reset and set to the correct width
          config[structureItem.key].width = new Control();
          config[structureItem.key].width.add(totalChildWidth);
        }
      }
    }
  });
}

export { prepareData };
