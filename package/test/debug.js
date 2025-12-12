import { parseStructure } from "../../lib/Structure.js";

const structure = 'config[database[host,port,credentials],api[endpoints,rateLimit,features]]';

const parsed = parseStructure(structure);
console.log("Parsed structure:");
console.log(JSON.stringify(parsed, null, 2));
