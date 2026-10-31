import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import vercelApp from "../api/index";
import { isGeminiConfigured, getGeminiModel, generateFarmerAssistantReply } from "./services/geminiService";

describe("Google Gemini AI Integration & Assistants Suite", () => {
  let app: express.Express;
  let server: any;
  let vercelServer: any;
  let baseUrl: string;
  let vercelBaseUrl: string;

  let farmerToken: string;
  let officerToken: string;

  beforeAll(async () => {
    // 1. Setup local express server
    app = express();
    app.use(express.json());
    app.use("/api", createProcurementApi());

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 3000;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 2. Setup Vercel serverless entry point server
    await new Promise<void>((resolve) => {
      vercelServer = vercelApp.listen(0, () => {
        const addr = vercelServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 3001;
        vercelBaseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 3. Obtain farmer auth token
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    const farmerData = await farmerLoginRes.json();
    farmerToken = farmerData.accessToken;

    // 4. Obtain officer auth token
    const officerLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });
    const officerData = await officerLoginRes.json();
    officerToken = officerData.accessToken;
  });

  afterAll(() => {
    server?.close();
    vercelServer?.close();
  });

  it("1. Gemini Connectivity & AI Status endpoint", async () => {
    const res = await fetch(`${baseUrl}/ai/status`);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.configured).toBe(true);
    expect(data.provider).toContain("Google Gemini AI");
    expect(data.model).toBeDefined();
    expect(data.supportedLanguages).toContain("EN");
    expect(data.supportedLanguages).toContain("TE");
    expect(data.supportedLanguages).toContain("HI");
  });

  it("2. Farmer Chatbot (English Query via Live Gemini)", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        question: "What is the MSP rate for Grade-A Paddy and what documents do I need to bring?",
        role: "farmer",
        language: "EN",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(typeof data.response).toBe("string");
    expect(data.response.length).toBeGreaterThan(20);
    expect(data.source).toBe("gemini");
    expect(data.sessionId).toBeDefined();
  });

  it("3. Farmer Chatbot (Telugu Query via Live Gemini)", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        question: "వరి ధాన్యం సేకరణ కేంద్రంలో స్లాట్ బుకింగ్ ఎలా చేసుకోవాలి?",
        role: "farmer",
        language: "TE",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.source).toBe("gemini");
    // Verify Telugu script characters in output
    const teluguRegex = /[\u0C00-\u0C7F]/;
    expect(teluguRegex.test(data.response)).toBe(true);
  });

  it("4. Farmer Chatbot (Hindi Query via Live Gemini)", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        question: "खरीद केंद्र पर टोकन जनरेट करने के लिए क्या नियम हैं?",
        role: "farmer",
        language: "HI",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.source).toBe("gemini");
    // Verify Devanagari script characters in output
    const hindiRegex = /[\u0900-\u097F]/;
    expect(hindiRegex.test(data.response)).toBe(true);
  });

  it("5. Officer AI Assistant with Role Validation", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        question: "Explain the standard operating procedure for handling moisture disputes during weighbridge verification.",
        role: "officer",
        language: "EN",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.source).toBe("gemini");
    expect(data.response.toLowerCase()).toMatch(/moisture|dispute|sample|weighbridge|sop/);
  });

  it("6. Chat Session Persistence & Clear Functionality", async () => {
    const testSessionId = `test-sess-${Date.now()}`;

    // Send first message with specific sessionId
    const chatRes = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        question: "Hello, I am testing session persistence.",
        role: "farmer",
      }),
    });
    expect(chatRes.status).toBe(200);

    // Check history
    const historyRes = await fetch(`${baseUrl}/ai/chat/history?sessionId=${testSessionId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(Array.isArray(historyData.messages)).toBe(true);
    expect(historyData.messages.length).toBeGreaterThanOrEqual(2); // user + assistant

    // Clear history
    const clearRes = await fetch(`${baseUrl}/ai/chat/clear`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({ sessionId: testSessionId }),
    });
    expect(clearRes.status).toBe(200);
    const clearData = await clearRes.json();
    expect(clearData.success).toBe(true);

    // Verify history is empty
    const verifyHistoryRes = await fetch(`${baseUrl}/ai/chat/history?sessionId=${testSessionId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const verifyData = await verifyHistoryRes.json();
    expect(verifyData.messages.length).toBe(0);
  });

  it("7. Handles Input Validation (empty/invalid requests)", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        question: "   ", // Blank message
        role: "farmer",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VALIDATION_ERROR");
  });

  it("8. Protects Officer Endpoint from unauthorized role spoofing", async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`, // Farmer token claiming to be officer
      },
      body: JSON.stringify({
        question: "Show me internal operational summaries.",
        role: "officer",
      }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("FORBIDDEN");
  });

  it("9. Graceful Fallback on Missing or Broken Gemini Client", async () => {
    const fallbackReply = await generateFarmerAssistantReply({
      question: "What is the MSP rate?",
      language: "EN",
      history: [],
      context: { farmerName: "Venkat" },
    });

    expect(fallbackReply.text).toBeDefined();
    expect(typeof fallbackReply.text).toBe("string");
    expect(fallbackReply.text.length).toBeGreaterThan(10);
    expect(["gemini", "fallback"]).toContain(fallbackReply.source);
  });

  it("10. Vercel Serverless Function Compatibility", async () => {
    const res = await fetch(`${vercelBaseUrl}/ai/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.configured).toBe(true);
    expect(data.provider).toContain("Google Gemini AI");
    expect(data.model).toBeDefined();
  });
});
