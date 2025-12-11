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

// Parse arguments - aux4 will pass three parameters: format, table, lineNumbers
let format, structure = "", lineNumbers = false;

if (args.length >= 1 && args.length <= 3) {
  format = args[0];
  structure = args[1] || "";
  // Handle boolean parameter - aux4 might pass "true"/"false" strings or actual boolean
  const lineNumbersParam = args[2];
  lineNumbers = lineNumbersParam === 'true' || lineNumbersParam === true;
} else {
  console.error(
    `Usage: 2table <format> [columns] [lineNumbers]\nFormats: ascii, md\nExamples:\n  2table ascii name,age,city false\n  2table ascii name,age,city true\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (!format) {
  console.error(
    `Usage: 2table <format> [columns] [lineNumbers]\nFormats: ascii, md\nExamples:\n  2table ascii name,age,city false\n  2table ascii name,age,city true\nIf columns is omitted, structure will be auto-generated from JSON`
  );
  process.exit(1);
}

if (format !== "ascii" && format !== "md") {
  console.error(`Invalid format: ${format}\nSupported formats: ascii, md`);
  process.exit(1);
}

(async () => {
  let input;

  try {
    const inputString = await readStdIn();
    input = JSON.parse(inputString);

    // Validate that input is either an object or array
    if (input === null || input === undefined) {
      console.error("Input cannot be null or undefined");
      process.exit(1);
    }

    if (typeof input !== 'object') {
      console.error("Input must be a JSON object or array of objects, received:", typeof input);
      process.exit(1);
    }

    // If input is a single object (not an array), wrap it in an array
    if (!Array.isArray(input)) {
      input = [input];
    }

    // Validate that array contains valid objects
    if (input.length === 0) {
      console.error("Input array cannot be empty");
      process.exit(1);
    }

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
  } catch (e) {
    if (e.name === 'SyntaxError') {
      console.error("Invalid JSON input - please ensure your input is valid JSON format");
    } else {
      console.error("Error processing input:", e.message);
    }
    process.exit(1);
  }

  if (!structure || structure.trim() === "") {
    structure = generateStructureFromJson(input);
    if (!structure) {
      console.error("Unable to generate structure from JSON input");
      process.exit(1);
    }
  }

  const tableStructure = parseStructure(structure);
  const config = new Config(tableStructure);

  let data;

  try {
    data = prepareData(input, tableStructure, config);
  } catch (e) {
    console.error("Error parsing the data:", e.message);
    process.exit(2);
  }

  try {
    let table;

    if (format === "ascii") {
      table = new AsciiTable(data, tableStructure, config, true, lineNumbers);
    } else if (format === "md") {
      table = new MarkdownTable(data, tableStructure, config, true, lineNumbers);
    }
    console.log(table.print());
  } catch (e) {
    console.error("cannot print the table:", e.message);
    process.exit(3);
  }
})();
