import { describe, it, expect } from "vitest";
import {
  isGeminiConfigured,
  getGeminiModel,
  detectLanguage,
  sanitizeInput,
  checkAiRateLimit,
  testGeminiConnectivity,
  generateFarmerAssistantReply,
  generateOfficerAssistantReply,
} from "./services/geminiService";

describe("Gemini AI Assistant Service & Diagnostics Suite", () => {
  it("detects language correctly for English, Telugu, and Hindi", () => {
    expect(detectLanguage("What is the MSP of Paddy?")).toBe("EN");
    expect(detectLanguage("వరి మద్దతు ధర ఎంత?")).toBe("TE");
    expect(detectLanguage("धान का न्यूनतम समर्थन मूल्य क्या है?")).toBe("HI");
    expect(detectLanguage("వరి", "HI")).toBe("HI"); // manual override
  });

  it("sanitizes input and removes script injection", () => {
    expect(sanitizeInput("  Hello World  ")).toBe("Hello World");
    expect(sanitizeInput("```alert('test')```")).toBe("'''alert('test')'''");
    expect(sanitizeInput("<script>alert(1)</script>Safe text")).toBe("Safe text");
  });

  it("enforces sliding-window rate limits", () => {
    const testKey = `test-ip-${Date.now()}`;
    const check1 = checkAiRateLimit(testKey, 2, 5000);
    expect(check1.allowed).toBe(true);
    expect(check1.remaining).toBe(1);

    const check2 = checkAiRateLimit(testKey, 2, 5000);
    expect(check2.allowed).toBe(true);
    expect(check2.remaining).toBe(0);

    const check3 = checkAiRateLimit(testKey, 2, 5000);
    expect(check3.allowed).toBe(false);
    expect(check3.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("verifies Gemini API configuration and supported model", () => {
    const configured = isGeminiConfigured();
    const model = getGeminiModel();
    expect(model).toBeDefined();
    expect(["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]).toContain(model);
    if (configured) {
      expect(process.env.GEMINI_API_KEY?.length).toBeGreaterThan(10);
    }
  });

  it("probes live Gemini connectivity and returns valid probe result", async () => {
    if (!isGeminiConfigured()) return;
    const probe = await testGeminiConnectivity();
    expect(probe).toBeDefined();
    expect(probe.model).toBeDefined();
    if (probe.ok) {
      expect(probe.latencyMs).toBeGreaterThan(0);
    }
  }, 15000);

  it("generates a genuine Gemini response for an agricultural question", async () => {
    if (!isGeminiConfigured()) return;
    const result = await generateFarmerAssistantReply({
      question: "What is the official AP MSP for Common Paddy in 2025-26?",
      language: "EN",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(20);
    expect(result.source).toBe("gemini");
    expect(result.text).toContain("2,300");
  }, 15000);
});
