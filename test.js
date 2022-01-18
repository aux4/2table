const { Table } = require("./lib/Table");
const { parseStructure } = require("./lib/Structure");
const { arrangeData } = require("./lib/Data");
const { Config } = require("./lib/Config");

const data = [
  {
    name: "David",
    birthday: "1986-03-14",
    age: 35,
    lastBook: {
      id: 1,
      title: "AI for all"
    },
    readingList: [
      {
        id: 1,
        title: "AI for all",
        year: 2022
      },
      {
        id: 2,
        title: "Machine Learning Mastery",
        year: 2018
      }
    ]
  },
  {
    name: "Natalia Sobreira",
    birthday: "1985-12-16",
    age: 36,
    lastBook: {
      id: 3,
      title: "Makeup today"
    },
    readingList: []
  },
  {
    name: "Sarah",
    age: 3,
    lastBook: {
      id: 5,
      title: "Holy Bible"
    },
    readingList: [
      {
        id: 10,
        title: "Mickey and friends",
        year: 1987
      },
      {
        id: 12,
        title: "Paw Patrol",
        year: 2020
      }
    ]
  }
];

const structure =
  "name:Name,birthday,other,lastBook:Last Book(title),lastBook:Book Info[id,title],age:Age,readingList:List[id,title],age:Old";
// "name,readingList[id,title]";

const tableStructure = parseStructure(structure);

const config = new Config(tableStructure);

const out = arrangeData(data, tableStructure, config);

const simple = new Table(out, tableStructure, config);
console.log(simple.print());
