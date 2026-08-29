import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { createMockAssistantReply } from "./services/mockAiService";

describe("Live Weather & Advanced AI Assistant Verification", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
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

    return () => {
      server.close();
    };
  });

  it("GET /api/weather returns accurate AP district weather, advisories, and 3-day forecasts", async () => {
    // 1. Guntur district
    const resGuntur = await fetch(`${baseUrl}/weather?district=Guntur`);
    expect(resGuntur.status).toBe(200);
    const dataGuntur = await resGuntur.json();
    expect(dataGuntur.weather).toBeDefined();
    expect(dataGuntur.weather.district).toBe("Guntur");
    expect(dataGuntur.weather.state).toBe("Andhra Pradesh");
    expect(dataGuntur.weather.temperature).toBeGreaterThan(20);
    expect(dataGuntur.weather.humidity).toBeDefined();
    expect(dataGuntur.weather.safeHarvestingIndex).toBeDefined();
    expect(dataGuntur.weather.advisoryEn).toContain("paddy harvesting");
    expect(dataGuntur.weather.advisoryTe).toBeDefined();
    expect(dataGuntur.weather.advisoryHi).toBeDefined();
    expect(dataGuntur.weather.forecast.length).toBe(3);

    // 2. Vijayawada district
    const resVja = await fetch(`${baseUrl}/weather?district=Vijayawada`);
    expect(resVja.status).toBe(200);
    const dataVja = await resVja.json();
    expect(dataVja.weather.district).toBe("NTR / Vijayawada");

    // 3. Tirupati district
    const resTpt = await fetch(`${baseUrl}/weather?district=Tirupati`);
    expect(resTpt.status).toBe(200);
    const dataTpt = await resTpt.json();
    expect(dataTpt.weather.district).toBe("Tirupati");
  });

  it("createMockAssistantReply supports multi-intent queries in English, Telugu, and Hindi", () => {
    const mockContext = {
      farmerName: "Ramesh Kumar",
      bookingCode: "BK-2026-7294",
      tokenNumber: "P-042",
      centreName: "Guntur Agricultural Market Yard",
      slotDate: "2026-03-18",
      slotTime: "10:30 – 11:00 AM",
      queuePosition: 18,
      peopleAhead: 17,
      estimatedWaitMinutes: 30,
      procurementStatus: "BOOKED",
    };

    // Weather query in Telugu
    const replyTe = createMockAssistantReply("వాతావరణం ఎలా ఉంది? కోత సురక్షితమేనా?", mockContext, "TE");
    expect(replyTe).toContain("వాతావరణం");

    // Weather query in Hindi
    const replyHi = createMockAssistantReply("क्या आज मौसम फसल कटाई के लिए सुरक्षित है?", mockContext, "HI");
    expect(replyHi).toContain("मौसम");

    // MSP rate query in English
    const replyMsp = createMockAssistantReply("What is the MSP rate for Grade A Paddy?", mockContext, "EN");
    expect(replyMsp).toContain("₹2,320");

    // Transport query in English
    const replyTrans = createMockAssistantReply("How to book subsidized vehicle?", mockContext, "EN");
    expect(replyTrans).toContain("30%");
  });
});
