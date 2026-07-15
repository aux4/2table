/**
 * CSV Renderer - Dumb renderer that reads Table cells and outputs RFC 4180 CSV.
 * Contains no JSON parsing logic - it just renders cell contents as comma-separated rows.
 *
 * Like MarkdownRenderer, it ignores colors and width formatting (CSV is for machine
 * consumption): ANSI codes are stripped and multi-line/wrapped cells are collapsed to a
 * single line.
 *
 * Multi-level headers (colspan in the ASCII/Markdown renderers, e.g. "address[street,city]")
 * have no equivalent in CSV, so they are FLATTENED to a single header row. The flattened
 * labels reuse the existing dot-notation convention already used for nested keys/columns in
 * this codebase (see Structure.js `generateHierarchicalKeys`, where a nested key is
 * `parent.child`): "address[street,city]" -> `address.street`, `address.city`.
 *
 * The flattened header labels are derived from the parsed structure (Structure.js) rather
 * than inferred spatially from the header cells: a top-level leaf placed between two groups
 * leaves an empty cell below it that spatial span-inference cannot disambiguate, whereas the
 * parsed structure is unambiguous. Data rows are still read straight from the table cells.
 */
import { parseStructure } from "./Structure.js";

export class CsvRenderer {
  constructor(table, structure = "") {
    this.table = table;
    this.structure = structure;
  }

  /**
   * Render the table as CSV: one flattened header row followed by one row per data row.
   */
  print() {
    const { columns, rows, totalCells } = this.table.getDimensions();
    if (totalCells === 0) {
      return "";
    }

    const parsed = parseStructure(this.structure);
    const headerRowCount = this.calculateHeaderRowCount(parsed);
    const headers = this.buildHeaders(parsed, columns);

    const lines = [];
    lines.push(this.buildRecord(headers.map(label => this.escape(label))));

    // Data rows start after all header rows.
    for (let rowNum = headerRowCount + 1; rowNum <= rows; rowNum++) {
      lines.push(this.buildRecord(this.buildRowFields(rowNum, columns)));
    }

    return lines.join("\n");
  }

  /**
   * Build the flattened header labels for every column.
   * Leaf labels come from the parsed structure in left-to-right column order. When line
   * numbers are enabled the table has one extra leading column, which is labelled "#".
   */
  buildHeaders(parsed, columns) {
    const leafPaths = [];
    this.collectLeafPaths(parsed, "", leafPaths);

    const offset = columns - leafPaths.length;
    const headers = [];
    for (let col = 0; col < columns; col++) {
      const leafIndex = col - offset;
      const leafLabel = leafPaths[leafIndex];
      // The leading offset columns are non-structure columns (line numbers -> "#").
      const label = leafLabel !== undefined ? leafLabel : this.leadingColumnLabel(col);
      headers.push(label);
    }
    return headers;
  }

  /**
   * Label for a leading non-structure column. The only such column produced by the parser
   * is the line-number column, whose header cell is "#".
   */
  leadingColumnLabel(col) {
    const cell = this.table.getCell(this.table.getCellReference(col, 1));
    return this.stripAnsi(cell.content).trim();
  }

  /**
   * Depth-first collection of leaf label paths. Nested labels are joined with "." to match
   * the dot-notation key convention used throughout the codebase.
   */
  collectLeafPaths(items, prefix, out) {
    items.forEach(item => {
      const label = this.cleanLabel(item.label !== undefined ? item.label : item.field);
      const path = prefix ? `${prefix}.${label}` : label;

      const isGroup = item.group && item.group.length > 0;
      const collectGroup = () => this.collectLeafPaths(item.group, path, out);
      const collectLeaf = () => out.push(path);

      (isGroup ? collectGroup : collectLeaf)();
    });
  }

  /**
   * Number of leading header rows equals the nesting depth of the parsed structure.
   */
  calculateHeaderRowCount(parsed) {
    const depthOf = items =>
      items.reduce((max, item) => {
        const childDepth = item.group && item.group.length > 0 ? 1 + depthOf(item.group) : 1;
        return Math.max(max, childDepth);
      }, 1);

    return depthOf(parsed);
  }

  /**
   * Build the CSV field list for a single data row.
   */
  buildRowFields(rowNum, columns) {
    const fields = [];
    for (let col = 0; col < columns; col++) {
      const cell = this.table.getCell(this.table.getCellReference(col, rowNum));
      // Collapse multi-line/wrapped content to a single line (ignore width formatting).
      const value = cell.multiline.map(line => this.stripAnsi(line)).join(" ").trim();
      fields.push(this.escape(value));
    }
    return fields;
  }

  /**
   * Join escaped fields into one CSV record.
   */
  buildRecord(escapedFields) {
    return escapedFields.join(",");
  }

  /**
   * Strip surrounding quotes from a structure label (labels may be quoted, e.g. "Email Address").
   */
  cleanLabel(label) {
    const text = this.stripAnsi(String(label));
    const isQuoted = text.length >= 2 && text.startsWith('"') && text.endsWith('"');
    return isQuoted ? text.slice(1, -1) : text;
  }

  /**
   * Remove ANSI color codes.
   */
  stripAnsi(text) {
    if (!text) return "";
    return String(text).replace(/\x1b\[[0-9;]*m/g, "");
  }

  /**
   * RFC 4180 quoting: wrap a field in double quotes when it contains a comma, double quote,
   * carriage return or newline; embedded double quotes are doubled.
   */
  escape(field) {
    const value = field === null || field === undefined ? "" : String(field);
    const needsQuoting = /[",\r\n]/.test(value);
    const quote = () => `"${value.replace(/"/g, '""')}"`;
    const passthrough = () => value;
    return (needsQuoting ? quote : passthrough)();
  }
}
