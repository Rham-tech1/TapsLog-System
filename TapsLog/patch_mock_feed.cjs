const fs = require('fs');

const p = 'C:/Users/PC/Desktop/TopsLog/TapsLog/src/lib/mockData.js';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  `export function generateInitialFeed() {
  return Array.from({ length: 6 }, (_, i) => makeMockScanEvent(i));
}`,
  `export function generateInitialFeed() {
  return [];
}`
);

fs.writeFileSync(p, content, 'utf8');
console.log('mockData.js initial feed set to empty');
