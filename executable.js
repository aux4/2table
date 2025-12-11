#!/usr/bin/env node

process.stdin.setEncoding("utf8");

import { Table, Config, parseStructure, prepareData } from "./index.js";
import { AsciiTable } from "./lib/AsciiTable.js";
import { MarkdownTable } from "./lib/MarkdownTable.js";
import { readStdIn } from "./lib/Input.js";
import { generateStructureFromJson } from "./lib/AutoStructure.js";
import colors from "colors";

colors.enable();

const args = process.argv.splice(2);

// Parse arguments - aux4 will pass four parameters: format, table, lineNumbers, showInvalidLines
let format, structure = "", lineNumbers = false, showInvalidLines = false;

if (args.length >= 1 && args.length <= 4) {
  format = args[0];
  structure = args[1] || "";

  // If structure equals format, it means no structure was specified (aux4 default behavior)
  if (structure === format) {
    structure = "";
  }
  // Handle boolean parameters - aux4 might pass "true"/"false" strings or actual booleans
  const lineNumbersParam = args[2];
  lineNumbers = lineNumbersParam === 'true' || lineNumbersParam === true;
  const showInvalidLinesParam = args[3];
  showInvalidLines = showInvalidLinesParam === 'true' || showInvalidLinesParam === true;
} else {
  console.error(
    `Usage: 2table <format> [columns] [lineNumbers] [showInvalidLines]\nFormats: ascii, md\nExamples:\n  2table ascii name,age,city false false\n  2table ascii name,age,city true false\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (!format) {
  console.error(
    `Usage: 2table <format> [columns] [lineNumbers] [showInvalidLines]\nFormats: ascii, md\nExamples:\n  2table ascii name,age,city false false\n  2table ascii name,age,city true false\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (format !== "ascii" && format !== "md") {
  console.error(`Invalid format: ${format}\nSupported formats: ascii, md`);
  process.exit(1);
}

(async () => {
  let input;
  let invalidLines = [];

  try {
    const inputString = await readStdIn();
    input = JSON.parse(inputString);

    // Check if the new invalid line handling should be used first
    const useNewInvalidHandling = lineNumbers || showInvalidLines;

    if (!useNewInvalidHandling) {
      // Original behavior: strict validation
      if (input === null || input === undefined) {
        console.error("Input cannot be null or undefined");
        process.exit(1);
      }

      if (typeof input !== 'object') {
        console.error("Input must be a JSON object or array of objects, received:", typeof input);
        process.exit(1);
      }
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

    if (useNewInvalidHandling) {
      // New behavior: handle invalid lines gracefully using wrapper objects
      const wrappedData = [];

      for (let i = 0; i < input.length; i++) {
        const originalLineNumber = i + 1;

        if (input[i] === null || input[i] === undefined) {
          if (showInvalidLines) {
            invalidLines.push({ lineNumber: originalLineNumber, reason: 'null or undefined' });
          }
          // Skip invalid items
        } else if (typeof input[i] !== 'object' || Array.isArray(input[i])) {
          if (showInvalidLines) {
            invalidLines.push({ lineNumber: originalLineNumber, reason: `must be an object, received: ${typeof input[i]}` });
          }
          // Skip invalid items
        } else {
          // Wrap valid items with line number information
          wrappedData.push({
            lineNumber: originalLineNumber,
            item: input[i]
          });
        }
      }

      input = wrappedData;

      // Check if we have any valid data to process
      if (input.length === 0 && invalidLines.length === 0) {
        console.error("No valid data to process");
        process.exit(1);
      }
    } else {
      // Original behavior: exit on invalid array items
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

  // Extract data for structure generation and processing
  const dataForStructure = (lineNumbers || showInvalidLines) ?
    input.map(wrapper => wrapper.item) :
    input;

  if (!structure || structure.trim() === "") {
    if (dataForStructure.length === 0 && invalidLines.length > 0) {
      // All data is invalid but we're showing invalid lines
      // Use a minimal structure for the invalid line display
      structure = "data";
    } else {
      structure = generateStructureFromJson(dataForStructure);
      if (!structure) {
        console.error("Unable to generate structure from JSON input");
        process.exit(1);
      }
    }
  } else if (dataForStructure.length === 0 && invalidLines.length > 0) {
    // Structure was provided but all data is invalid - use only the first column
    const providedStructure = structure.split(',')[0].trim();
    structure = providedStructure;
  }

  const tableStructure = parseStructure(structure);
  const config = new Config(tableStructure);

  let data;

  try {
    if (dataForStructure.length === 0 && invalidLines.length > 0) {
      // All data is invalid, create empty data array
      data = [];
    } else {
      data = prepareData(dataForStructure, tableStructure, config);
    }
  } catch (e) {
    console.error("Error parsing the data:", e.message);
    process.exit(2);
  }

  try {
    let table;

    // Pass wrapper data for line number extraction if using new handling
    const wrapperData = (lineNumbers || showInvalidLines) ? input : null;

    if (format === "ascii") {
      table = new AsciiTable(data, tableStructure, config, true, lineNumbers, invalidLines, wrapperData);
    } else if (format === "md") {
      table = new MarkdownTable(data, tableStructure, config, true, lineNumbers, invalidLines, wrapperData);
    }
    console.log(table.print());
  } catch (e) {
    console.error("cannot print the table:", e.message);
    process.exit(3);
  }
})();
