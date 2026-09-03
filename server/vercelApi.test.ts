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
});
