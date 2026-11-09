const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('client/src/locales/en.json', 'utf8'));
const existingKeys = new Set(Object.keys(en).map(k => k.trim()));

// Also add lowercase versions to set for case-insensitive check
const existingKeysLower = new Set(Object.keys(en).map(k => k.trim().toLowerCase()));

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'locales') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const clientFiles = walkDir('client/src');
console.log('Scanning', clientFiles.length, 'files in client/src...');

const extractedStrings = new Set();
const extractedWords = new Set();

const JSX_TEXT_RE = />\s*([A-Za-z0-9][^<>{}\n\r]*[A-Za-z0-9\.!?])\s*</g;
const STRING_LITERAL_RE = /["'`]([A-Z][A-Za-z0-9\s,\.\-–—'’/()#%&*+!?:;]{2,120})["'`]/g;
const ATTR_RE = /(?:placeholder|title|aria-label|label|alt|hint|sub|body|eyebrow|desc|description|header)=["']([^"']+)["']/g;

for (const filePath of clientFiles) {
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Extract JSX Text
  let match;
  while ((match = JSX_TEXT_RE.exec(content)) !== null) {
    const str = match[1].trim();
    if (str && !str.startsWith('http') && !str.startsWith('import ') && !str.startsWith('export ') && !str.includes('=>') && !str.includes('className=')) {
      if (!/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(str)) {
        extractedStrings.add(str);
      }
    }
  }

  // 2. Extract Attributes
  while ((match = ATTR_RE.exec(content)) !== null) {
    const str = match[1].trim();
    if (str && !str.startsWith('/') && !str.includes('{') && !str.includes('}')) {
      extractedStrings.add(str);
    }
  }

  // 3. Extract String literals that look like UI text (starts with Capital letter)
  while ((match = STRING_LITERAL_RE.exec(content)) !== null) {
    const str = match[1].trim();
    // Filter out common code constants, routes, CSS class names
    if (
      !str.includes('border-') &&
      !str.includes('bg-') &&
      !str.includes('text-') &&
      !str.includes('rounded-') &&
      !str.includes('flex-') &&
      !str.includes('grid-') &&
      !str.includes('col-') &&
      !str.includes('px-') &&
      !str.includes('py-') &&
      !str.includes('h-') &&
      !str.includes('w-') &&
      !str.startsWith('/api') &&
      !str.startsWith('http') &&
      !str.startsWith('application/') &&
      !str.endsWith('.png') &&
      !str.endsWith('.jpg') &&
      !str.endsWith('.svg') &&
      !str.endsWith('.json') &&
      !str.endsWith('.ts') &&
      !str.endsWith('.tsx') &&
      !str.includes('__') &&
      str.length > 2
    ) {
      extractedStrings.add(str);
    }
  }
}

// Extract distinct english words (3+ letters) from all extracted strings
for (const str of extractedStrings) {
  const words = str.split(/[^A-Za-z]+/);
  for (const w of words) {
    if (w.length >= 3 && !/^[0-9]+$/.test(w)) {
      extractedWords.add(w);
      // Capitalized form
      const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      extractedWords.add(cap);
    }
  }
}

console.log('Total unique strings extracted:', extractedStrings.size);
console.log('Total unique individual words extracted:', extractedWords.size);

const missingStrings = [];
for (const s of extractedStrings) {
  if (!existingKeys.has(s) && !existingKeysLower.has(s.toLowerCase())) {
    missingStrings.push(s);
  }
}

const missingWords = [];
for (const w of extractedWords) {
  if (!existingKeys.has(w) && !existingKeysLower.has(w.toLowerCase())) {
    missingWords.push(w);
  }
}

console.log('Strings missing in master dictionary:', missingStrings.length);
console.log('Words missing in master dictionary:', missingWords.length);

fs.writeFileSync('scripts/missing_strings_scan.json', JSON.stringify({
  missingStrings: missingStrings.slice(0, 1500),
  missingWords: missingWords.slice(0, 1500)
}, null, 2), 'utf8');

console.log('Saved scan results to scripts/missing_strings_scan.json');

