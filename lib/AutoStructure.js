/**
 * Auto-structure generation - simplified version
 */
export function generateStructureFromJson(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const sample = data[0];
  const fields = [];

  for (const key in sample) {
    const value = sample[key];

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Array of objects - create grouped structure
      const subFields = Object.keys(value[0]);
      fields.push(`${key}[${subFields.join(',')}]`);
    } else if (typeof value === 'object' && value !== null) {
      // Object - create grouped structure
      const subFields = Object.keys(value);
      fields.push(`${key}[${subFields.join(',')}]`);
    } else {
      // Simple field
      fields.push(key);
    }
  }

  return fields.join(',');
}