const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, '..', 'client', 'src', 'lib', 'translations.ts');
let src = fs.readFileSync(translationsPath, 'utf8');

const te = JSON.parse(fs.readFileSync('master_te_dictionary.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('master_hi_dictionary.json', 'utf8'));

console.log(`Loaded ${Object.keys(te).length} TE entries, ${Object.keys(hi).length} HI entries.`);

// Build new comprehensiveFeatureTranslations block
const newBlock = `export const comprehensiveFeatureTranslations: Partial<Record<Language, Record<string, string>>> = {
  TE: ${JSON.stringify(te, null, 2)},
  HI: ${JSON.stringify(hi, null, 2)},
};`;

// Replace comprehensiveFeatureTranslations block in translations.ts
const compRegex = /export const comprehensiveFeatureTranslations: Partial<Record<Language, Record<string, string>>> = \{[\s\S]*?\n\};/;

if (!compRegex.test(src)) {
  console.error("Could not find comprehensiveFeatureTranslations block in translations.ts!");
  process.exit(1);
}

src = src.replace(compRegex, newBlock);

// Replace getLocalizedText with enhanced version
const oldGetLocalizedRegex = /export function getLocalizedText\(key: string, lang: Language\): string \{[\s\S]*?\n\}/;

const enhancedGetLocalized = `export function getLocalizedText(key: string, lang: Language): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (lang === "EN") {
    // If the string was already localized into a regional language, look up its English source
    if (reverseTranslationMap[trimmed]) return reverseTranslationMap[trimmed];
    if (reverseTranslationMap[key]) return reverseTranslationMap[key];
    return key;
  }

  // 1. If key is in a regional language, first normalize to English canonical key
  const normalizedKey = reverseTranslationMap[trimmed] || reverseTranslationMap[key] || trimmed;
  const dict = localizedUiText[lang];
  if (!dict) return normalizedKey;

  // 2. Direct exact or trimmed match
  if (dict[key]) return dict[key];
  if (dict[trimmed]) return dict[trimmed];
  if (dict[normalizedKey]) return dict[normalizedKey];

  // 3. Punctuation stripping / prefix-suffix restoration
  const punctMatch = key.match(/^([\\s·•–—\\-\\*:()\\[\\]\\+]+)?(.*?)([\\s·•–—\\-\\*:()\\[\\]\\+]+)?$/);
  if (punctMatch) {
    const prefix = punctMatch[1] || "";
    const core = (punctMatch[2] || "").trim();
    const suffix = punctMatch[3] || "";
    if (core && core !== key) {
      const coreNorm = reverseTranslationMap[core] || core;
      if (dict[coreNorm] || dict[core]) {
        return prefix + (dict[coreNorm] || dict[core]) + suffix;
      }
    }
  }

  // 4. Trailing colon handling: e.g. "Total Farmers:" -> localized("Total Farmers") + ":"
  if (trimmed.endsWith(":")) {
    const base = trimmed.slice(0, -1).trim();
    const baseNorm = reverseTranslationMap[base] || base;
    if (dict[baseNorm] || dict[base]) {
      return (dict[baseNorm] || dict[base]) + ":";
    }
  }

  // 5. Trailing asterisk handling: e.g. "Mobile Number *" -> localized("Mobile Number") + " *"
  if (trimmed.endsWith("*")) {
    const base = trimmed.slice(0, -1).trim();
    const baseNorm = reverseTranslationMap[base] || base;
    if (dict[baseNorm] || dict[base]) {
      return (dict[baseNorm] || dict[base]) + " *";
    }
  }

  // 6. Number in parentheses: e.g. "Available Slots (12)" -> localized("Available Slots") + " (12)"
  const parenNumMatch = trimmed.match(/^(.*?)(\\s*\\(\\s*\\d+\\s*\\))$/);
  if (parenNumMatch) {
    const base = parenNumMatch[1].trim();
    const numPart = parenNumMatch[2];
    const baseNorm = reverseTranslationMap[base] || base;
    if (dict[baseNorm] || dict[base]) {
      return (dict[baseNorm] || dict[base]) + numPart;
    }
  }

  return normalizedKey;
}`;

if (!oldGetLocalizedRegex.test(src)) {
  console.error("Could not find getLocalizedText function in translations.ts!");
  process.exit(1);
}

src = src.replace(oldGetLocalizedRegex, enhancedGetLocalized);

fs.writeFileSync(translationsPath, src, 'utf8');
console.log(`Successfully updated ${translationsPath} with master dictionaries and smart normalization.`);
