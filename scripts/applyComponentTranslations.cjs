const fs = require('fs');
const path = require('path');

const te = JSON.parse(fs.readFileSync('client/src/locales/te.json', 'utf8'));

function isExcluded(s) {
  const t = s.trim();
  if (!t || t.length <= 1) return true;
  if (/^[\d\s.,:;!?%₹\/\(\)\-\+—–·•#@\^&*_{}\[\]\|\\=<>~`"']+$/.test(t)) return true;
  if (/^(?:\+91|FMR-|AP-|TKN-|REQ-|BKG-)/.test(t)) return true;
  if (t.includes('=>') || t.includes('void |') || t.includes('pixel') || t.includes('width') || t.includes('viewport') || t.includes('newLat') || t.includes('newLng') || t.includes('===')) return true;
  if (/^₹?\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*[a-zA-Z]+)?$/.test(t)) return true;
  return false;
}

const targetFiles = [
  'client/src/components/MandiMarketPrices.tsx',
  'client/src/components/WeatherSellingAdvisory.tsx',
  'client/src/components/Map.tsx',
];

for (const rel of targetFiles) {
  const full = path.join(__dirname, '..', rel);
  const src = fs.readFileSync(full, 'utf8');
  const lines = src.split('\n');
  let count = 0;

  const modifiedLines = lines.map(line => {
    return line.replace(/>([^<>{}\r\n]+)</g, (fullMatch, content) => {
      const trimmed = content.trim();
      if (isExcluded(trimmed)) return fullMatch;

      if (te[trimmed] || te[content]) {
        const key = te[trimmed] ? trimmed : content;
        const leadingWs = content.match(/^\s*/)[0];
        const trailingWs = content.match(/\s*$/)[0];
        const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        count++;
        return `>${leadingWs}{tUi("${escaped}", language)}${trailingWs}<`;
      }
      return fullMatch;
    });
  });

  fs.writeFileSync(full, modifiedLines.join('\n'), 'utf8');
  console.log(`Transformed ${rel}: ${count} text nodes localized.`);
}
