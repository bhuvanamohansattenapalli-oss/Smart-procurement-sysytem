import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { isPostgresActive } from "./db";

describe("Database Resilience & Error Response Guarantees", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const api = createProcurementApi();
    app.use("/api", api);

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

  it("handles farmer login: returns 200 when DB is active, or 503 when DB is unreachable", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9876543210",
        password: "Farmer@2026",
      }),
    });

    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();

    if (res.status === 503) {
      expect(data.error).toBe("DATABASE_UNAVAILABLE");
      expect(data.message).toContain("Database");
    } else {
      expect(res.status).toBe(200);
      expect(data.accessToken).toBeDefined();
      expect(data.tokenType).toBe("Bearer");
      expect(data.farmer).toBeDefined();
    }
  });

  it("handles officer login: returns 200 when DB is active, or 503 when DB is unreachable", async () => {
    const res = await fetch(`${baseUrl}/api/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officerCode: "OFF-NZM-104",
        password: "Officer@2026",
      }),
    });

    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();

    if (res.status === 503) {
      expect(data.error).toBe("DATABASE_UNAVAILABLE");
    } else {
      expect(res.status).toBe(200);
      expect(data.accessToken).toBeDefined();
      expect(data.officer).toBeDefined();
    }
  });

  it("returns clean JSON error when farmer password is incorrect (HTTP 401 or 503 when DB is down)", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9876543210",
        password: "WrongPassword999",
      }),
    });

    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();

    if (res.status === 503) {
      expect(data.error).toBe("DATABASE_UNAVAILABLE");
    } else {
      expect(res.status).toBe(401);
      expect(data.error).toBe("INVALID_CREDENTIALS");
      expect(data.message).toContain("password");
    }
  });

  it("returns clean JSON error when farmer phone number does not exist (HTTP 401 or 503 when DB is down)", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9111111111",
        password: "SomePassword123",
      }),
    });

    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();

    if (res.status === 503) {
      expect(data.error).toBe("DATABASE_UNAVAILABLE");
    } else {
      expect(res.status).toBe(401);
      expect(data.error).toBe("FARMER_NOT_FOUND");
    }
  });

  it("returns clean JSON error on validation failure (HTTP 400)", async () => {
    const res = await fetch(`${baseUrl}/api/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "123", // invalid 10-digit phone
        password: "short", // less than 8 chars
      }),
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(data.error).toBe("VALIDATION_ERROR");
    expect(data.message).toBeDefined();
  });

  it("handles database health check and reports status cleanly", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
  });
});
