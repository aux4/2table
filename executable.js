#!/usr/bin/env node

process.stdin.setEncoding("utf8");

import { AsciiRenderer } from "./lib/AsciiRenderer.js";
import { MarkdownRenderer } from "./lib/MarkdownRenderer.js";
import { Table } from "./lib/Table.js";
import { TableParser } from "./lib/TableParser.js";

// Read from stdin
async function readStdIn() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

const args = process.argv.splice(2);

// Parse arguments - handle both positional and flag formats
let format, structure = "", lineNumbers = false, showInvalidLines = false;

// Check for flag-based arguments (--table, --lineNumbers, --showInvalidLines)
if (args.includes('--table')) {
  const tableIndex = args.indexOf('--table');
  if (tableIndex + 1 < args.length) {
    structure = args[tableIndex + 1];
    // Remove the flag and value from args
    args.splice(tableIndex, 2);
  }
}

if (args.includes('--lineNumbers')) {
  const lineNumberIndex = args.indexOf('--lineNumbers');
  if (lineNumberIndex + 1 < args.length) {
    const lineNumberValue = args[lineNumberIndex + 1];
    lineNumbers = lineNumberValue === 'true' || lineNumberValue === true;
    // Remove the flag and value from args
    args.splice(lineNumberIndex, 2);
  }
}

if (args.includes('--showInvalidLines')) {
  const showInvalidIndex = args.indexOf('--showInvalidLines');
  if (showInvalidIndex + 1 < args.length) {
    const showInvalidValue = args[showInvalidIndex + 1];
    showInvalidLines = showInvalidValue === 'true' || showInvalidValue === true;
    // Remove the flag and value from args
    args.splice(showInvalidIndex, 2);
  }
}

// Parse remaining positional arguments
if (args.length >= 1 && args.length <= 4) {
  format = args[0];
  structure = args[1] || "";

  // If structure equals format, it means no structure was specified (aux4 default behavior)
  if (structure === format) {
    structure = "";
  }

  // Handle legacy positional boolean parameters if no flags were used
  if (!args.includes('--lineNumbers') && args.length >= 3) {
    const lineNumbersParam = args[2];
    lineNumbers = lineNumbersParam === 'true' || lineNumbersParam === true;
  }
  if (!args.includes('--showInvalidLines') && args.length >= 4) {
    const showInvalidLinesParam = args[3];
    showInvalidLines = showInvalidLinesParam === 'true' || showInvalidLinesParam === true;
  }
} else {
  console.error(
    `Usage: 2table <format> [columns] [--lineNumbers true/false] [--showInvalidLines true/false]\\nFormats: ascii, md\\nExamples:\\n  2table ascii name,age,city --lineNumbers true\\n  2table ascii name,age,city true false\\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (!format) {
  console.error(
    `Usage: 2table <format> [columns] [lineNumbers] [showInvalidLines]\\nFormats: ascii, md\\nExamples:\\n  2table ascii name,age,city false false\\n  2table ascii name,age,city true false\\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (format !== "ascii" && format !== "md") {
  console.error(`Invalid format: ${format}\\nSupported formats: ascii, md`);
  process.exit(1);
}

(async () => {
  let input;

  let invalidLines = [];
  let validLineNumbers = [];
  let originalInput = null;

  try {
    const inputString = await readStdIn();
    input = JSON.parse(inputString);

    // Handle invalid lines feature
    if (lineNumbers || showInvalidLines) {
      // New behavior: handle invalid lines gracefully using legacy logic

      // If input is a single object (not an array), wrap it in an array first
      if (!Array.isArray(input)) {
        input = [input];
      }

      // Store original input for showInvalidLines=true case
      originalInput = [...input];

      // Identify invalid lines and filter data accordingly
      const validData = [];
      for (let i = 0; i < input.length; i++) {
        const originalLineNumber = i + 1;
        const item = input[i];

        if (item === null || item === undefined || typeof item !== 'object' || Array.isArray(item)) {
          // Invalid item
          invalidLines.push({
            lineNumber: originalLineNumber,
            reason: item === null || item === undefined ? 'null or undefined' : `invalid type: ${typeof item}`
          });
        } else {
          // Valid item - keep it with original line number
          validData.push(item);
          validLineNumbers.push(originalLineNumber);
        }
      }

      // Always use valid data - the legacy system will insert invalid line placeholders based on invalidLines array
      input = validData;

      // Special handling for all-invalid data case
      if (validData.length === 0 && invalidLines.length > 0 && structure) {
        // When all data is invalid, only show the first column to contain the <invalid line> text
        const structureParts = structure.split(',');
        if (structureParts.length > 1) {
          structure = structureParts[0];
        }
      }

    } else {
      // Original behavior: strict validation
      if (input === null || input === undefined) {
        console.error("Input cannot be null or undefined");
        process.exit(1);
      }

      if (typeof input !== 'object') {
        console.error("Input must be a JSON object or array of objects, received:", typeof input);
        process.exit(1);
      }

      // If input is a single object (not an array), wrap it in an array first
      if (!Array.isArray(input)) {
        input = [input];
      }

      // Validate that input is now an array (empty check will be done later)
      if (input.length === 0) {
        console.error("Input array cannot be empty");
        process.exit(1);
      }

      // Validate array items
      for (let i = 0; i < input.length; i++) {
        if (input[i] === null || input[i] === undefined) {
          console.error(`Invalid data: Item ${i + 1} is null or undefined`);
          process.exit(1);
        }
        if (typeof input[i] !== 'object' || Array.isArray(input[i])) {
          console.error(`Invalid data: Item ${i + 1} must be an object, received:`, typeof input[i]);
          process.exit(1);
        }
      }
    }
  } catch (e) {
    if (e.name === 'SyntaxError') {
      console.error("Invalid JSON input - please ensure your input is valid JSON format");
    } else {
      console.error("Error processing input:", e.message);
    }
    process.exit(1);
  }

  // Generate structure if not provided
  if (!structure || structure.trim() === "") {
    structure = await generateAutoStructure(input);
    if (!structure) {
      console.error("Unable to generate structure from JSON input");
      process.exit(1);
    }
  }

  try {
    // Create table and parse data into it
    const table = new Table();

    // Create wrapper data for line numbers if needed
    let wrapperData = null;
    if (lineNumbers || showInvalidLines) {
      if (validLineNumbers.length > 0) {
        // Use original line numbers for valid data (both true and false cases)
        wrapperData = input.map((item, index) => ({
          lineNumber: validLineNumbers[index],
          item: item
        }));
      } else {
        // Sequential line numbers for cases without invalid lines
        wrapperData = input.map((item, index) => ({
          lineNumber: index + 1,
          item: item
        }));
      }
    }

    await TableParser.parseIntoTable(table, input, structure, lineNumbers, showInvalidLines ? invalidLines : [], wrapperData);

    // Create appropriate renderer and print
    if (format === "ascii") {
      const renderer = new AsciiRenderer(table);
      console.log(renderer.print());
    } else if (format === "md") {
      const renderer = new MarkdownRenderer(table);
      console.log(renderer.print());
    }
  } catch (e) {
    console.error("cannot print the table:", e.message);
    console.error("Stack:", e.stack);
    process.exit(3);
  }
})();

/**
 * Generate auto-structure from JSON data using legacy logic
 */
async function generateAutoStructure(data) {
  if (!data || data.length === 0) return "";

  try {
    // Use the legacy auto-structure generation
    const { generateStructureFromJson } = await import('./lib/legacy2/AutoStructure.js');
    return generateStructureFromJson(data);
  } catch (e) {
    console.error('Error generating auto-structure:', e.message);

    // Fallback to simple structure
    const allKeys = new Set();
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    }
    return Array.from(allKeys).join(',');
  }
}