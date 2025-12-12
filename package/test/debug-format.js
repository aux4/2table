import { generateStructureFromJson } from '../../lib/AutoStructure.js';
import { parseStructure } from '../../lib/Structure.js';
import { prepareData } from '../../lib/Data.js';
import { Config } from '../../lib/Config.js';
import fs from 'fs';

const input = fs.readFileSync('complex-data.json', 'utf-8');
const data = JSON.parse(input);

const structureString = generateStructureFromJson(data);
const parsedStructure = parseStructure(structureString);
const config = new Config(parsedStructure);
const preparedData = prepareData([data], parsedStructure, config);

console.log('Prepared data for config field:');
const configValue = preparedData[0]['config:config'];
console.log('Type:', typeof configValue);
console.log('Is array:', Array.isArray(configValue));
console.log('Keys:', Object.keys(configValue));

console.log('\nValue for database key:');
const databaseValue = configValue['database:database'];
console.log('Type:', typeof databaseValue);
console.log('Value:', JSON.stringify(databaseValue, null, 2));

// Test the formatting function locally
const formatObjectValue = (obj) => {
  return Object.entries(obj)
    .map(([key, value]) => {
      const displayKey = key.includes(':') ? key.split(':')[1] : key;
      console.log(`Processing ${displayKey}: ${typeof value}, isArray: ${Array.isArray(value)}`);
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return `${displayKey}: ${value.join(',')}`;
        } else {
          console.log(`Recursing into object: ${displayKey}`);
          return `${displayKey}: (${formatObjectValue(value)})`;
        }
      }
      return `${displayKey}: ${value}`;
    })
    .join(", ");
};

console.log('\nFormatted result:');
const formatted = formatObjectValue(configValue);
console.log(formatted);