import { getGeminiClient, getGeminiModel } from "./geminiService";

export type SupportedLanguage = "EN" | "TE" | "HI";

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: SupportedLanguage;
  provider: "gemini" | "dictionary" | "cached" | "passthrough";
  cached: boolean;
}

export interface BatchTranslationResult {
  translations: string[];
  sourceLang: string;
  targetLang: SupportedLanguage;
  provider: string;
}

interface CacheEntry {
  translated: string;
  expiresAt: number;
}

// In-memory Translation Cache with 24-hour TTL and PII filtering
const translationCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 3000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cacheHits = 0;
let cacheMisses = 0;

/**
 * PII Detection Filter:
 * Ensures sensitive farmer or officer data (Aadhaar, phones, passwords, bank accounts, tokens)
 * is NEVER cached in memory or persistent stores.
 */
export function containsSensitivePii(text: string): boolean {
  if (!text) return false;
  // 12-digit Aadhaar pattern or masked Aadhaar
  if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(text) || /\bX{4}\sX{4}\s\d{4}\b/i.test(text)) return true;
  // 10-digit Indian mobile number
  if (/\b[6-9]\d{9}\b/.test(text)) return true;
  // Bank Account numbers (9 to 18 consecutive digits)
  if (/\b\d{9,18}\b/.test(text)) return true;
  // Bearer tokens or JWTs
  if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(text) || /eyJ[a-zA-Z0-9_\-\.]{20,}/.test(text)) return true;
  // Passwords or PINs
  if (/\bpassword\b|\bpin\s*:\s*\d+/i.test(text)) return true;
  return false;
}

function getCacheKey(text: string, targetLang: SupportedLanguage): string {
  return `${targetLang}:${text.trim().toLowerCase()}`;
}

export function cleanExpiredCache(): void {
  const now = Date.now();
  translationCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      translationCache.delete(key);
    }
  });
}

/**
 * Centrally maintained essential agrarian glossary for instant sub-millisecond translations.
 * These guaranteed terms ensure zero latency for recurring agricultural phrases.
 */
export const AGRARIAN_DICTIONARY: Record<SupportedLanguage, Record<string, string>> = {
  EN: {},
  TE: {
    "Paddy": "వరి / ధాన్యం",
    "Common Paddy": "సాధారణ వరి",
    "Grade A Paddy": "గ్రేడ్-ఎ వరి",
    "Cotton": "ప్రత్తి",
    "Maize": "మొక్కజొన్న",
    "Groundnut": "వేరుశనగ",
    "Red Gram": "కందులు",
    "Bengal Gram": "శనగలు",
    "Black Gram": "మినుములు",
    "Green Gram": "పెసలు",
    "Chillies": "మిరప",
    "Minimum Support Price": "కనీస మద్దతు ధర (MSP)",
    "MSP Rate": "మద్దతు ధర",
    "Fair Average Quality": "నాణ్యతా ప్రమాణాలు (FAQ)",
    "Moisture Content": "తేమ శాతం",
    "Maximum Moisture Permissible": "గరిష్ట అనుమతించదగిన తేమ 17.0%",
    "Weighbridge": "వేబ్రిడ్జ్ / తూనిక కాటా",
    "Gross Weight": "స్థూల బరువు",
    "Tare Weight": "ఖాళీ వాహనం బరువు",
    "Net Weight": "నికర బరువు",
    "Direct Benefit Transfer": "నేరుగా బ్యాంకు ఖాతాలో జమ (DBT)",
    "Rythu Bharosa Kendram": "రైతు భరోసా కేంద్రం (RBK)",
    "Procurement Centre": "ధాన్యం కొనుగోలు కేంద్రం",
    "Arrival Slot": "రాక సమయం / స్లాట్",
    "Token Number": "టోకెన్ నంబర్",
    "Queue Position": "క్యూలో స్థానం",
    "Tractor Trolley": "ట్రాక్టర్ ట్రాలీ",
    "Mini Truck": "మినీ ట్రక్",
    "Heavy Lorry": "భారీ లారీ",
    "Freight Subsidy": "ప్రభుత్వ రవాణా రాయితీ (30%)",
    "Optimal for harvesting": "వరి కోతకు వాతావరణం అత్యంత అనుకూలంగా ఉంది",
    "High rain risk, delay harvest": "భారీ వర్ష సూచన ఉంది, కోత వాయిదా వేయండి",
    "Moderate rain, cover grains": "ఓ మోస్తరు వర్షం, ధాన్యంపై టార్పాలిన్లు కప్పండి",
  },
  HI: {
    "Paddy": "धान",
    "Common Paddy": "सामान्य धान",
    "Grade A Paddy": "ग्रेड-ए धान",
    "Cotton": "कपास",
    "Maize": "मक्का",
    "Groundnut": "मूंगफली",
    "Red Gram": "अरहर / तुअर",
    "Bengal Gram": "चना",
    "Black Gram": "उड़द",
    "Green Gram": "मूंग",
    "Chillies": "मिर्च",
    "Minimum Support Price": "न्यूनतम समर्थन मूल्य (MSP)",
    "MSP Rate": "एमएसपी दर",
    "Fair Average Quality": "उचित औसत गुणवत्ता (FAQ)",
    "Moisture Content": "नमी प्रतिशत",
    "Maximum Moisture Permissible": "अधिकतम अनुमेय नमी 17.0%",
    "Weighbridge": "धर्मकांटा / तुलाई केंद्र",
    "Gross Weight": "सकल वजन (Gross)",
    "Tare Weight": "खाली वाहन वजन (Tare)",
    "Net Weight": "शुद्ध फसल वजन (Net)",
    "Direct Benefit Transfer": "प्रत्यक्ष लाभ अंतरण (DBT)",
    "Rythu Bharosa Kendram": "रायथु भरोसा केंद्र (RBK)",
    "Procurement Centre": "धान खरीद केंद्र / मंडी",
    "Arrival Slot": "आगमन स्लॉट",
    "Token Number": "टोकन नंबर",
    "Queue Position": "कतार में स्थान",
    "Tractor Trolley": "ट्रैक्टर ट्रॉली",
    "Mini Truck": "मिनी ट्रक",
    "Heavy Lorry": "भारी ट्रक",
    "Freight Subsidy": "सरकारी भाड़ा सब्सिडी (30%)",
    "Optimal for harvesting": "कटाई के लिए मौसम बहुत अनुकूल है",
    "High rain risk, delay harvest": "भारी बारिश की संभावना, कटाई स्थगित करें",
    "Moderate rain, cover grains": "हल्की बारिश, अनाज को तिरपाल से ढकें",
  },
};

/**
 * Central Dynamic Translation Service
 * Implements configurable provider selection, 24h caching, PII security filter,
 * and high-accuracy Indian agricultural terminology.
 */
export async function translateText({
  text,
  targetLang,
  sourceLang = "EN",
}: {
  text: string;
  targetLang: SupportedLanguage;
  sourceLang?: string;
}): Promise<TranslationResult> {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      translatedText: "",
      sourceLang,
      targetLang,
      provider: "passthrough",
      cached: false,
    };
  }

  // 1. If target is English and source is English, return immediately
  if (targetLang === "EN" && (!sourceLang || sourceLang === "EN")) {
    return {
      translatedText: trimmed,
      sourceLang: "EN",
      targetLang: "EN",
      provider: "passthrough",
      cached: false,
    };
  }

  const cacheKey = getCacheKey(trimmed, targetLang);

  // 2. Check in-memory TTL cache (if text contains no sensitive PII)
  const isPii = containsSensitivePii(trimmed);
  if (!isPii) {
    const cached = translationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      cacheHits++;
      return {
        translatedText: cached.translated,
        sourceLang,
        targetLang,
        provider: "cached",
        cached: true,
      };
    }
  }

  cacheMisses++;

  // 3. Check Agrarian Dictionary for instant lookup
  const dict = AGRARIAN_DICTIONARY[targetLang];
  if (dict && dict[trimmed]) {
    const translated = dict[trimmed];
    if (!isPii && translationCache.size < MAX_CACHE_ENTRIES) {
      translationCache.set(cacheKey, {
        translated,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return {
      translatedText: translated,
      sourceLang,
      targetLang,
      provider: "dictionary",
      cached: false,
    };
  }

  // 4. Use Configured Provider (Gemini AI by default, zero extra cost)
  const providerConfig = process.env.TRANSLATION_PROVIDER || "gemini";
  if (providerConfig === "gemini") {
    try {
      const client = getGeminiClient();
      const model = getGeminiModel();

      if (client && model) {
        const targetLanguageFullName =
          targetLang === "TE" ? "Telugu (తెలుగు)" : targetLang === "HI" ? "Hindi (हिंदी)" : "English";

        const systemPrompt = `You are the official agricultural translator for ProcureFlow, Andhra Pradesh Government's Smart Procurement Platform.
Translate the user input text faithfully into ${targetLanguageFullName}.

MANDATORY TRANSLATION GUIDELINES:
1. Provide warm, natural, and accurate agricultural phrasing in ${targetLanguageFullName}.
2. Use standard Indian agrarian terms:
   - Telugu: వరి (Paddy), కనీస మద్దతు ధర (MSP), తేమ శాతం (Moisture), బస్తాలు (Bags), క్వింటాళ్లు (Quintals), ఈ-క్రాప్ (e-Crop), రైతు భరోసా కేంద్రం (RBK), ధాన్యం కొనుగోలు కేంద్రం (Mandi/Procurement Centre), నేరుగా బ్యాంకు ఖాతాలో జమ / డీబీటీ (DBT).
   - Hindi: धान (Paddy), न्यूनतम समर्थन मूल्य (MSP), नमी प्रतिशत (Moisture), बोरी (Bags), क्विंटल (Quintals), ई-क्रॉप, प्रत्यक्ष लाभ अंतरण / डीबीटी (DBT), कृषि उपज मंडी.
3. NEVER modify or invent numerical values, prices (₹), dates, percentages (%), and units (quintals, kg, acres).
4. NEVER mistranslate system IDs, codes, or official standard names (e.g. BK-2026-7294, P-042, ProcureFlow, Rythu Bharosa Kendram, e-Crop, DBT, AP Civil Supplies, Grade A).
5. Return ONLY the translated text without extra explanation, markdown headers, or quotes.`;

        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nText to translate:\n${trimmed}` }],
            },
          ],
          config: {
            temperature: 0.1, // Low temperature for deterministic translation accuracy
            maxOutputTokens: 600,
          },
        });

        const translated = (response.text || "").trim();
        if (translated) {
          // Cache successful translation if not containing PII
          if (!isPii) {
            cleanExpiredCache();
            if (translationCache.size < MAX_CACHE_ENTRIES) {
              translationCache.set(cacheKey, {
                translated,
                expiresAt: Date.now() + CACHE_TTL_MS,
              });
            }
          }

          return {
            translatedText: translated,
            sourceLang,
            targetLang,
            provider: "gemini",
            cached: false,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Translation Service Warning] Gemini translation error: ${err?.message || err}. Falling back to passthrough.`);
    }
  }

  // Fallback: Safe passthrough
  return {
    translatedText: trimmed,
    sourceLang,
    targetLang,
    provider: "passthrough",
    cached: false,
  };
}

/**
 * Batch translation helper for translating multiple strings in parallel
 */
export async function translateBatch({
  texts,
  targetLang,
  sourceLang = "EN",
}: {
  texts: string[];
  targetLang: SupportedLanguage;
  sourceLang?: string;
}): Promise<BatchTranslationResult> {
  if (!texts || texts.length === 0) {
    return { translations: [], sourceLang, targetLang, provider: "passthrough" };
  }

  const results = await Promise.all(
    texts.map(text => translateText({ text, targetLang, sourceLang }))
  );

  return {
    translations: results.map(r => r.translatedText),
    sourceLang,
    targetLang,
    provider: results[0]?.provider || "passthrough",
  };
}

export function getTranslationStats() {
  return {
    provider: process.env.TRANSLATION_PROVIDER || "gemini",
    supportedLanguages: ["EN", "TE", "HI"] as SupportedLanguage[],
    cacheSize: translationCache.size,
    maxCacheSize: MAX_CACHE_ENTRIES,
    cacheHits,
    cacheMisses,
    ttlHours: CACHE_TTL_MS / (60 * 60 * 1000),
  };
}

export function clearTranslationCache(): void {
  translationCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}
