import { describe, expect, it, beforeEach } from "vitest";
import {
  translateText,
  translateBatch,
  containsSensitivePii,
  getTranslationStats,
  clearTranslationCache,
  AGRARIAN_DICTIONARY,
} from "./services/translationService";

describe("Translation Service & Multilingual Architecture", () => {
  beforeEach(() => {
    clearTranslationCache();
  });

  describe("PII & Sensitive Data Detection Filter", () => {
    it("flags 12-digit Indian Aadhaar numbers", () => {
      expect(containsSensitivePii("Farmer Aadhaar: 1234 5678 9012")).toBe(true);
      expect(containsSensitivePii("UID: XXXX XXXX 9012")).toBe(true);
    });

    it("flags 10-digit Indian phone numbers", () => {
      expect(containsSensitivePii("Call farmer at 9876543210")).toBe(true);
      expect(containsSensitivePii("Mobile: 8123456789")).toBe(true);
    });

    it("flags bank account numbers and passwords", () => {
      expect(containsSensitivePii("Account 123456789012345")).toBe(true);
      expect(containsSensitivePii("password: mySecretPassword123")).toBe(true);
      expect(containsSensitivePii("PIN: 4321")).toBe(true);
    });

    it("flags authorization bearer tokens", () => {
      expect(containsSensitivePii("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz")).toBe(true);
    });

    it("allows standard agrarian procurement phrases through", () => {
      expect(containsSensitivePii("Common Paddy minimum support price is ₹2,300 per quintal")).toBe(false);
      expect(containsSensitivePii("Maximum moisture content permissible is 17.0%")).toBe(false);
      expect(containsSensitivePii("Rythu Bharosa Kendram slot booking confirmed")).toBe(false);
    });
  });

  describe("Agrarian Dictionary Instant Lookups", () => {
    it("translates essential agrarian terminology to Telugu instantly", async () => {
      const result = await translateText({ text: "Paddy", targetLang: "TE" });
      expect(result.translatedText).toBe(AGRARIAN_DICTIONARY.TE["Paddy"]);
      expect(result.provider).toBe("dictionary");
    });

    it("translates essential agrarian terminology to Hindi instantly", async () => {
      const result = await translateText({ text: "Minimum Support Price", targetLang: "HI" });
      expect(result.translatedText).toBe(AGRARIAN_DICTIONARY.HI["Minimum Support Price"]);
      expect(result.provider).toBe("dictionary");
    });

    it("preserves English text without unnecessary translation overhead", async () => {
      const input = "Quality inspection passed for Paddy at Mandi Yard";
      const result = await translateText({ text: input, targetLang: "EN" });
      expect(result.translatedText).toBe(input);
      expect(result.provider).toBe("passthrough");
    });
  });

  describe("Batch Translation", () => {
    it("translates an array of agricultural phrases", async () => {
      const terms = ["Paddy", "Cotton", "Maize", "Weighbridge"];
      const result = await translateBatch({ texts: terms, targetLang: "TE" });
      expect(result.translations.length).toBe(4);
      expect(result.translations[0]).toBe(AGRARIAN_DICTIONARY.TE["Paddy"]);
      expect(result.translations[1]).toBe(AGRARIAN_DICTIONARY.TE["Cotton"]);
      expect(result.translations[2]).toBe(AGRARIAN_DICTIONARY.TE["Maize"]);
      expect(result.translations[3]).toBe(AGRARIAN_DICTIONARY.TE["Weighbridge"]);
    });
  });

  describe("Cache Management & Stats", () => {
    it("tracks cache stats and clears correctly", () => {
      const initialStats = getTranslationStats();
      expect(initialStats.cacheSize).toBe(0);
      expect(initialStats.supportedLanguages).toEqual(["EN", "TE", "HI"]);

      clearTranslationCache();
      const clearedStats = getTranslationStats();
      expect(clearedStats.cacheSize).toBe(0);
      expect(clearedStats.cacheHits).toBe(0);
    });
  });
});
