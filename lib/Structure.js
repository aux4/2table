/**
 * Structure parser - simplified version for new architecture
 * Parses structure strings like "name,logs[level,message],metrics[cpu,memory,disk]"
 */

export function parseStructure(structure) {
  if (!structure) return [];

  const parsedItems = parseItems(structure);

  // Generate hierarchical keys to avoid conflicts
  return generateHierarchicalKeys(parsedItems);
}

function generateHierarchicalKeys(items, parentKey = '') {
  return items.map(item => {
    // Create hierarchical key
    const hierarchicalKey = parentKey ? `${parentKey}.${item.field}` : item.field;

    const updatedItem = {
      ...item,
      key: hierarchicalKey
    };

    // Recursively process nested groups
    if (item.group) {
      updatedItem.group = generateHierarchicalKeys(item.group, hierarchicalKey);
    }

    return updatedItem;
  });
}

function parseItems(str) {
  const items = [];
  let current = '';
  let bracketDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth--;

    if (char === ',' && bracketDepth === 0) {
      items.push(parseItem(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    items.push(parseItem(current.trim()));
  }

  return items;
}

function parseItem(item) {
  // Parse field name (everything before first [ or {)
  const fieldMatch = item.match(/^([^:[\]{]+)/);
  if (!fieldMatch) {
    throw new Error(`Invalid structure item: ${item}`);
  }

  const field = fieldMatch[1];

  // Check for label (field:label format)
  const labelMatch = item.match(/^[^:[\]{]+:([^[\]{]+)/);
  const label = labelMatch ? labelMatch[1] : field;

  // Extract group content between matching brackets
  let groupStr = null;
  let propertiesStr = null;

  const fieldAndLabel = labelMatch ? `${field}:${label}` : field;
  let remaining = item.substring(fieldAndLabel.length);

  // Parse group if it starts with [
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
      groupStr = remaining.substring(1, groupEnd); // Skip opening [, exclude closing ]
      remaining = remaining.substring(groupEnd + 1); // Skip past closing ]
    }
  }

  // Parse properties if remaining starts with {
  if (remaining.startsWith('{')) {
    const propsEnd = remaining.indexOf('}');
    if (propsEnd !== -1) {
      propertiesStr = remaining.substring(1, propsEnd); // Skip { and }
    }
  }

  let group = null;
  if (groupStr) {
    group = parseItems(groupStr);
  }

  let properties = {};
  if (propertiesStr) {
    properties = parseProperties(propertiesStr);
  }

  return {
    field: field,
    key: field, // For compatibility
    label: label,
    group: group,
    properties: properties
  };
}

function parseProperties(propertiesStr) {
  const properties = {};

  if (propertiesStr) {
    propertiesStr
      .split(";")
      .map(property => property.split(":"))
      .forEach(([key, value]) => {
        if (key && value !== undefined) {
          // Parse numeric values
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