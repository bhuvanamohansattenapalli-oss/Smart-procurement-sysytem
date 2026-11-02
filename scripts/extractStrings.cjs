const fs = require('fs');
const path = require('path');

const files = [
  'client/src/pages/Home.tsx',
  'client/src/components/MandiMarketPrices.tsx',
  'client/src/components/WeatherSellingAdvisory.tsx',
  'client/src/components/Map.tsx',
  'client/src/components/DashboardLayout.tsx',
];

const strings = new Set();

for (const relPath of files) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;
  const src = fs.readFileSync(fullPath, 'utf8');

  // Strip code expressions in { ... }
  let cleaned = src.replace(/\{[^{}]*\}/g, ' ');
  cleaned = cleaned.replace(/\{[^{}]*\}/g, ' ');

  // 1. Text nodes
  const textRegex = />([^<>{}\n\r]+)</g;
  let m;
  while ((m = textRegex.exec(cleaned)) !== null) {
    const t = m[1].trim();
    if (t.length > 1 && !/^[\d\s.,:;!?%₹\/\(\)\-\+—–·•]+$/.test(t) && !t.startsWith('http') && !t.startsWith('var(') && !t.includes('=>') && !t.includes('void | Promise') && !t.includes('new Promise') && !t.includes('matrixSize')) {
      strings.add(t);
    }
  }

  // 2. Placeholders
  const phRegex = /placeholder=["']([^"']+)["']/g;
  while ((m = phRegex.exec(src)) !== null) {
    const t = m[1].trim();
    if (t.length > 1 && !t.includes('{')) strings.add(t);
  }

  // 3. Titles
  const titleRegex = /title=["']([^"']+)["']/g;
  while ((m = titleRegex.exec(src)) !== null) {
    const t = m[1].trim();
    if (t.length > 1 && !t.includes('{')) strings.add(t);
  }

  // 4. Aria labels
  const ariaRegex = /aria-label=["']([^"']+)["']/g;
  while ((m = ariaRegex.exec(src)) !== null) {
    const t = m[1].trim();
    if (t.length > 1 && !t.includes('{')) strings.add(t);
  }
}

const arr = Array.from(strings).sort((a, b) => a.localeCompare(b));
const outputPath = path.join(__dirname, '..', 'all_extracted_strings.json');
fs.writeFileSync(outputPath, JSON.stringify(arr, null, 2), 'utf8');
console.log('Total extracted unique strings across all files:', arr.length);
