const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  ProcureFlow Automated Multilingual Translation Audit');
console.log('================================================================\n');

// 1. Load and parse translations.ts
const translationsPath = path.join(__dirname, '..', 'client', 'src', 'lib', 'translations.ts');
const translationsSrc = fs.readFileSync(translationsPath, 'utf8');

// Helper to extract keys and values from an object block in code
function extractDictionary(langCode) {
  const dict = new Map();
  // Find localizedUiText block
  const blockRegex = new RegExp(`['"]?${langCode}['"]?\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'g');
  let match;
  while ((match = blockRegex.exec(translationsSrc)) !== null) {
    const blockContent = match[1];
    const pairRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let pair;
    while ((pair = pairRegex.exec(blockContent)) !== null) {
      const key = pair[1].replace(/\\"/g, '"');
      const val = pair[2].replace(/\\"/g, '"');
      dict.set(key, val);
      dict.set(key.trim(), val);
    }
  }
  return dict;
}

const teDict = extractDictionary('TE');
const hiDict = extractDictionary('HI');

console.log(`[Dictionary Stats]`);
console.log(`- Telugu (TE) keys loaded: ${teDict.size}`);
console.log(`- Hindi (HI) keys loaded:   ${hiDict.size}`);

// Check for empty values
let emptyTe = 0;
for (const [k, v] of teDict.entries()) {
  if (!v || !v.trim()) emptyTe++;
}
let emptyHi = 0;
for (const [k, v] of hiDict.entries()) {
  if (!v || !v.trim()) emptyHi++;
}
console.log(`- Empty values: TE=${emptyTe}, HI=${emptyHi}\n`);

// 2. Scan frontend files
const filesToScan = [
  path.join(__dirname, '..', 'client', 'src', 'pages', 'Home.tsx'),
  path.join(__dirname, '..', 'client', 'src', 'components', 'MandiMarketPrices.tsx'),
  path.join(__dirname, '..', 'client', 'src', 'components', 'WeatherSellingAdvisory.tsx'),
  path.join(__dirname, '..', 'client', 'src', 'components', 'Map.tsx'),
  path.join(__dirname, '..', 'client', 'src', 'components', 'DashboardLayout.tsx'),
  path.join(__dirname, '..', 'client', 'src', 'pages', 'NotFound.tsx'),
];

const IGNORED_STRINGS = new Set([
  'ProcureFlow', 'English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'EN', 'TE', 'HI', 'TA',
  'KN', 'ML', 'MR', 'BN', 'GU', 'PA', 'OR', 'AS', 'UR', 'FAQ', 'DBT', 'MSP', 'RBK', 'APMC',
  'AGMARKNET', 'VAA', 'VRO', 'IFSC', 'UTR', 'Qtl', 'mm', 'km', 'km/h', '°C', '%', '₹',
  'true', 'false', 'null', 'undefined', 'ok', 'error', 'GET', 'POST', 'PUT', 'DELETE',
  'new Promise', 'void | Promise',
]);

function isIgnored(str) {
  const t = str.trim();
  if (t.length <= 1) return true;
  if (/^[\d\s.,:;!?%₹\/\(\)\-\+—–·•]+$/.test(t)) return true;
  if (/^[a-z]+[A-Z0-9][a-zA-Z0-9]*$/.test(t)) return true; // camelCase identifiers
  if (/^[A-Z0-9_]+$/.test(t) && t.length < 15) return true; // CONSTANTS
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/')) return true;
  if (t.startsWith('var(--') || t.includes('px') && t.length < 10) return true;
  if (IGNORED_STRINGS.has(t)) return true;
  return false;
}

const auditResults = [];

for (const filePath of filesToScan) {
  if (!fs.existsSync(filePath)) continue;
  const fileName = path.basename(filePath);
  const src = fs.readFileSync(filePath, 'utf8');

  // Strip code expressions inside { ... } while preserving strings outside
  // Simple heuristic: remove blocks { ... } that do not contain JSX tags
  let cleanedSrc = src.replace(/\{[^{}]*\}/g, ' ');
  // Do a second pass for 1 level of nested braces
  cleanedSrc = cleanedSrc.replace(/\{[^{}]*\}/g, ' ');

  const visibleStrings = new Set();

  // Pattern 1: JSX Text nodes >Text<
  const textNodeRegex = />([^<>{}\n\r]+)</g;
  let match;
  while ((match = textNodeRegex.exec(cleanedSrc)) !== null) {
    const raw = match[1].trim();
    if (!isIgnored(raw)) {
      visibleStrings.add(raw);
    }
  }

  // Pattern 2: placeholder="..."
  const placeholderRegex = /placeholder=["']([^"']+)["']/g;
  while ((match = placeholderRegex.exec(src)) !== null) {
    const raw = match[1].trim();
    if (!isIgnored(raw)) {
      visibleStrings.add(raw);
    }
  }

  // Pattern 3: title="..."
  const titleRegex = /title=["']([^"']+)["']/g;
  while ((match = titleRegex.exec(src)) !== null) {
    const raw = match[1].trim();
    if (!isIgnored(raw)) {
      visibleStrings.add(raw);
    }
  }

  // Pattern 4: aria-label="..."
  const ariaRegex = /aria-label=["']([^"']+)["']/g;
  while ((match = ariaRegex.exec(src)) !== null) {
    const raw = match[1].trim();
    if (!isIgnored(raw)) {
      visibleStrings.add(raw);
    }
  }

  // Check which strings are translated in TE and HI
  const fileReport = {
    file: fileName,
    totalVisible: visibleStrings.size,
    translatedTe: 0,
    translatedHi: 0,
    missingTe: [],
    missingHi: [],
  };

  for (const str of visibleStrings) {
    // Exact or normalized check
    const normalized = str.replace(/^[\s·•–—\-\*\:\(\)]+|[\s·•–—\-\*\:\(\)]+$/g, '').trim();

    const hasTe = teDict.has(str) || teDict.has(normalized);
    const hasHi = hiDict.has(str) || hiDict.has(normalized);

    if (hasTe) {
      fileReport.translatedTe++;
    } else {
      fileReport.missingTe.push(str);
    }

    if (hasHi) {
      fileReport.translatedHi++;
    } else {
      fileReport.missingHi.push(str);
    }
  }

  auditResults.push(fileReport);
}

// Print Report
console.log('----------------------------------------------------------------');
console.log('FILE AUDIT SUMMARY:');
console.log('----------------------------------------------------------------');

let overallTotal = 0;
let overallTe = 0;
let overallHi = 0;

for (const report of auditResults) {
  overallTotal += report.totalVisible;
  overallTe += report.translatedTe;
  overallHi += report.translatedHi;

  const pctTe = report.totalVisible > 0 ? ((report.translatedTe / report.totalVisible) * 100).toFixed(1) : '100.0';
  const pctHi = report.totalVisible > 0 ? ((report.translatedHi / report.totalVisible) * 100).toFixed(1) : '100.0';

  console.log(`${report.file.padEnd(28)} Total: ${String(report.totalVisible).padStart(4)} | TE: ${String(report.translatedTe).padStart(4)} (${pctTe.padStart(5)}%) | HI: ${String(report.translatedHi).padStart(4)} (${pctHi.padStart(5)}%)`);
}

console.log('----------------------------------------------------------------');
const overallPctTe = overallTotal > 0 ? ((overallTe / overallTotal) * 100).toFixed(1) : '100.0';
const overallPctHi = overallTotal > 0 ? ((overallHi / overallTotal) * 100).toFixed(1) : '100.0';
console.log(`OVERALL APPLICATION:        Total: ${String(overallTotal).padStart(4)} | TE: ${String(overallTe).padStart(4)} (${overallPctTe.padStart(5)}%) | HI: ${String(overallHi).padStart(4)} (${overallPctHi.padStart(5)}%)`);
console.log('----------------------------------------------------------------\n');

// Sample missing strings per file
for (const report of auditResults) {
  if (report.missingTe.length > 0) {
    console.log(`Missing in ${report.file} (Sample first 10 of ${report.missingTe.length}):`);
    report.missingTe.slice(0, 10).forEach(s => console.log(`  - "${s}"`));
    console.log('');
  }
}

// Write detailed JSON audit report to disk
const reportPath = path.join(__dirname, '..', 'audit-multilingual-report.json');
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf8');
console.log(`[Audit Saved] Detailed report written to ${reportPath}\n`);
