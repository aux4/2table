#!/usr/bin/env node

process.stdin.setEncoding("utf8");

import { Table, Config, parseStructure, prepareData } from "./index.js";
import { AsciiTable } from "./lib/AsciiTable.js";
import { MarkdownTable } from "./lib/MarkdownTable.js";
import { readStdIn } from "./lib/Input.js";

const args = process.argv.splice(2);

if (args.length !== 2) {
  console.error(`Usage: 2table <format> <columns>\nFormats: ascii, md\nExamples: 2table ascii name,age,city or 2table md name,age,city`);
  process.exit(1);
}

const format = args[0];
const structure = args[1];

if (format !== "ascii" && format !== "md") {
  console.error(`Invalid format: ${format}\nSupported formats: ascii, md`);
  process.exit(1);
}

const tableStructure = parseStructure(structure);

const config = new Config(tableStructure);

(async () => {
  let input;

  try {
    const inputString = await readStdIn();
    input = JSON.parse(inputString);
  } catch (e) {
    console.error("Invalid JSON input:", e.message);
    process.exit(1);
  }

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
      table = new AsciiTable(data, tableStructure, config);
    } else if (format === "md") {
      table = new MarkdownTable(data, tableStructure, config);
    }
    console.log(table.print());
  } catch (e) {
    console.error("cannot print the table:", e.message);
    process.exit(3);
  }
})();
