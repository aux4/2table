const { Config } = require("./lib/Config");
const { Table } = require("./lib/Table");
const { parseStructure } = require("./lib/Structure");
const { prepareData } = require("./lib/Data");

module.exports = { Table, Config, parseStructure, prepareData };
