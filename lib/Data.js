/**
 * Data preparation - simplified for new architecture
 */
export function prepareData(data, structure, config) {
  // In the new architecture, data preparation is minimal
  // The TableBuilder handles the heavy lifting
  return Array.isArray(data) ? data : [data];
}