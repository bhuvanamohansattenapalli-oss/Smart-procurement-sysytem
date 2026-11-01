import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../api/index";

describe("Vercel Serverless Function API Entry Point (api/index.ts)", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 3000;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
  });

  it("handles GET /api/centres seamlessly on Vercel handler", async () => {
    const res = await fetch(`${baseUrl}/api/centres`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.centres)).toBe(true);
    expect(data.centres.length).toBeGreaterThan(0);
    expect(data.centres[0].name).toBeDefined();
  });

  it("handles GET /centres (root-relative path rewrite) seamlessly", async () => {
    const res = await fetch(`${baseUrl}/centres`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.centres)).toBe(true);
    expect(data.centres.length).toBeGreaterThan(0);
  });

  it("handles Farmer Login on Vercel handler", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.farmer).toBeDefined();
    expect(data.farmer.phone).toBe("9876543210");
  });

  it("handles Live Weather endpoint on Vercel handler", async () => {
    const res = await fetch(`${baseUrl}/api/weather?district=Guntur`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.weather.district).toBe("Guntur");
    expect(data.weather.temperature).toBeDefined();
  });

  it("handles Farmer History endpoint on Vercel handler with authorization", async () => {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const farmerId = loginData.farmer.id;

    // 2. Fetch history
    const historyRes = await fetch(`${baseUrl}/api/farmers/${farmerId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.farmerId).toBe(farmerId);
    expect(Array.isArray(historyData.timeline)).toBe(true);
    expect(historyData.summary).toBeDefined();
  });

  it("returns clean JSON 404 on unhandled API route", async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route-xyz`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("NOT_FOUND");
  });

  it("handles Officer Login on Vercel handler seamlessly", async () => {
    const res = await fetch(`${baseUrl}/api/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.officer).toBeDefined();
    expect(data.officer.officerCode).toBe("OFF-NZM-104");
    expect(data.officer.role).toBe("HEAD_OFFICER");
  });

  it("returns clean JSON 401 on incorrect password without throwing non-JSON or crashing", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "WrongPassword123" }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("INVALID_CREDENTIALS");
    expect(data.message).toBeDefined();
  });

  it("returns clean JSON 401 on non-existent farmer phone number", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9999999999", password: "AnyPassword123" }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("FARMER_NOT_FOUND");
    expect(data.message).toBeDefined();
  });

  it("handles fast /api/status diagnostic endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.environment).toBeDefined();
    expect(typeof data.environment.hasDatabaseUrl).toBe("boolean");
    expect(typeof data.environment.hasJwtSecret).toBe("boolean");
    expect(typeof data.environment.hasGeminiApiKey).toBe("boolean");
    expect(data.system.nodeVersion).toBeDefined();
  });

  it("handles /api/health endpoint seamlessly", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.service).toBe("ProcureFlow API");
  });

  it("handles Farmer Registration on Vercel handler", async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testPhone = `981111${randomSuffix}`;
    const res = await fetch(`${baseUrl}/api/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Farmer Vercel",
        phone: testPhone,
        password: "TestPassword@2026",
        village: "Test Village",
        district: "Guntur",
        primaryCrop: "Paddy",
        aadhaarMasked: "XXXX XXXX 9988",
        declarationAccepted: true,
      }),
    });

    expect([201, 409]).toContain(res.status);
    const data = await res.json();
    if (res.status === 201) {
      expect(data.status).toBe("PENDING");
      expect(data.farmer).toBeDefined();
    } else {
      expect(data.error).toBe("PHONE_EXISTS");
    }
  });
});
