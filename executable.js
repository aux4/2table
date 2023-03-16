#!/usr/bin/env node

process.stdin.setEncoding("utf8");

const { Table, Config, parseStructure, prepareData } = require(".");
const { readStdIn } = require("./lib/Input");

const args = process.argv.splice(2);

const structure = args[0];
if (!structure) {
  console.error(`Attribute columns are not specified:\n${"2table <columns comma separated>".cyan}`);
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
    console.error("Invalid JSON input");
    process.exit(1);
  }

  let data;

  try {
    data = prepareData(input, tableStructure, config);
  } catch (e) {
    console.error("Error parsing the data");
    process.exit(2);
  }

  try {
    const table = new Table(data, tableStructure, config);
    console.log(table.print());
  } catch (e) {
    console.error("cannot print the table");
    process.exit(3);
  }
})();
