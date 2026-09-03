import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";
import { CROP_CATALOGUE, filterCrops, getCatalogueCropImage } from "../client/src/lib/cropCatalogue";

describe("Crop Catalogue & Search Functionality", () => {
  it("validates crop catalogue structure with comprehensive categories and real images", () => {
    expect(CROP_CATALOGUE.length).toBeGreaterThanOrEqual(30);

    // Verify all major categories are represented
    const categories = new Set(CROP_CATALOGUE.map(c => c.category));
    expect(categories.has("Cereals")).toBe(true);
    expect(categories.has("Pulses")).toBe(true);
    expect(categories.has("Oilseeds")).toBe(true);
    expect(categories.has("Commercial")).toBe(true);
    expect(categories.has("Vegetables")).toBe(true);
    expect(categories.has("Fruits")).toBe(true);

    // Verify every crop has a valid Unsplash photograph URL (no empty or placeholder URLs)
    CROP_CATALOGUE.forEach(crop => {
      expect(crop.imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(crop.cropName.trim().length).toBeGreaterThan(0);
      expect(crop.effectiveRatePerQuintal).toBeGreaterThan(0);
      expect(crop.maxMoisturePercent).toBeGreaterThan(0);
    });
  });

  it("filters crops strictly by specific search query (e.g. 'Tomato' -> ONLY Tomato)", () => {
    const tomatoResults = filterCrops(CROP_CATALOGUE, "ALL", "Tomato");
    expect(tomatoResults.length).toBe(1);
    expect(tomatoResults[0].cropName).toBe("Tomato");
    expect(tomatoResults[0].category).toBe("Vegetables");

    // Unrelated crops should NOT be included
    const nonTomatoes = tomatoResults.filter(c => !c.cropName.toLowerCase().includes("tomato"));
    expect(nonTomatoes.length).toBe(0);
  });

  it("filters crops strictly by 'Mango' -> ONLY Mango", () => {
    const mangoResults = filterCrops(CROP_CATALOGUE, "ALL", "Mango");
    expect(mangoResults.length).toBe(1);
    expect(mangoResults[0].cropName).toBe("Mango");
    expect(mangoResults[0].category).toBe("Fruits");
  });

  it("filters crops by 'Paddy' -> Paddy crops matching catalogue", () => {
    const paddyResults = filterCrops(CROP_CATALOGUE, "ALL", "Paddy");
    expect(paddyResults.length).toBeGreaterThanOrEqual(1);
    paddyResults.forEach(r => {
      const match = r.cropName.toLowerCase().includes("paddy") || r.commonName.toLowerCase().includes("paddy");
      expect(match).toBe(true);
    });
  });

  it("handles case-insensitive search and partial crop names", () => {
    const lowercase = filterCrops(CROP_CATALOGUE, "ALL", "wheat");
    const uppercase = filterCrops(CROP_CATALOGUE, "ALL", "WHEAT");
    const mixedCase = filterCrops(CROP_CATALOGUE, "ALL", "wHeAt");
    expect(lowercase.length).toBe(uppercase.length);
    expect(lowercase.length).toBe(mixedCase.length);
    expect(lowercase[0].cropName).toContain("Wheat");

    const partial = filterCrops(CROP_CATALOGUE, "ALL", "pota");
    expect(partial.length).toBe(1);
    expect(partial[0].cropName).toBe("Potato");
  });

  it("returns empty array for non-existent crops and restores full catalogue when cleared", () => {
    const noMatch = filterCrops(CROP_CATALOGUE, "ALL", "NonExistentExtraterrestrialCrop123");
    expect(noMatch).toEqual([]);

    const cleared = filterCrops(CROP_CATALOGUE, "ALL", "");
    expect(cleared.length).toBe(CROP_CATALOGUE.length);
  });

  it("filters by category alone (e.g. Vegetables, Fruits)", () => {
    const vegetables = filterCrops(CROP_CATALOGUE, "Vegetables", "");
    expect(vegetables.length).toBeGreaterThanOrEqual(8);
    vegetables.forEach(v => expect(v.category).toBe("Vegetables"));

    const fruits = filterCrops(CROP_CATALOGUE, "Fruits", "");
    expect(fruits.length).toBeGreaterThanOrEqual(8);
    fruits.forEach(f => expect(f.category).toBe("Fruits"));
  });

  it("looks up real crop image correctly via getCatalogueCropImage", () => {
    const tomatoImg = getCatalogueCropImage("Tomato");
    expect(tomatoImg).toMatch(/^https:\/\/images\.unsplash\.com\//);

    const fallbackImg = getCatalogueCropImage("");
    expect(fallbackImg).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});

describe("Procurement Centre & Farmer History API Integration", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let farmerAToken: string;
  let farmerAId: number;
  let farmerBToken: string;
  let farmerBId: number;
  let newFarmerToken: string;
  let newFarmerId: number;

  beforeAll(async () => {
    await ensurePrototypeSeed();
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

    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Ensure Farmer A password is set and login
    await db.update(farmers).set({ passwordHash: hashPassword("Farmer@2026"), status: "APPROVED" }).where(eq(farmers.phone, "9876543210"));
    const loginARes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    const loginA = await loginARes.json();
    farmerAToken = loginA.accessToken;
    farmerAId = loginA.farmer.id;

    // Ensure Farmer B password is set and login
    await db.update(farmers).set({ passwordHash: hashPassword("Farmer@2026"), status: "APPROVED" }).where(eq(farmers.phone, "9876543211"));
    const loginBRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543211", password: "Farmer@2026" }),
    });
    const loginB = await loginBRes.json();
    farmerBToken = loginB.accessToken;
    farmerBId = loginB.farmer.id;

    // Register a brand new farmer to test empty history
    const uniquePhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regNewRes = await fetch(`${baseUrl}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fresh History Test Farmer",
        phone: uniquePhone,
        password: "FarmerPassword@123",
        aadhaarMasked: "XXXX XXXX 3333",
        village: "Test Village",
        district: "Guntur",
        primaryCrop: "Paddy",
        declarationAccepted: true,
      }),
    });
    const regNew = await regNewRes.json();
    newFarmerId = regNew.farmer.id;

    // Approve the new farmer in database
    await db.update(farmers).set({ status: "APPROVED" }).where(eq(farmers.id, newFarmerId));
    const loginNewRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: uniquePhone, password: "FarmerPassword@123" }),
    });
    const loginNew = await loginNewRes.json();
    newFarmerToken = loginNew.accessToken;
  });

  afterAll(() => {
    server?.close();
  });

  it("filters centres by exact and partial name and place", async () => {
    const res = await fetch(`${baseUrl}/centres`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const centresList = data.centres;
    expect(centresList.length).toBeGreaterThan(0);

    const vijayawada = centresList.filter((c: any) => c.name.toLowerCase().includes("vijayawada"));
    expect(vijayawada.length).toBe(1);
    expect(vijayawada[0].name).toContain("Vijayawada");

    const partial = centresList.filter((c: any) => c.name.toLowerCase().includes("gun"));
    expect(partial.length).toBeGreaterThanOrEqual(1);
    expect(partial[0].name).toContain("Guntur");
  });

  it("displays clean empty state for a newly registered farmer with no activity", async () => {
    const res = await fetch(`${baseUrl}/farmers/${newFarmerId}/history`, {
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.farmerId).toBe(newFarmerId);
    expect(data.timeline).toEqual([]);
    expect(data.bookings).toEqual([]);
    expect(data.transport).toEqual([]);
    expect(data.payments).toEqual([]);
    expect(data.summary.totalBookings).toBe(0);
    expect(data.summary.totalTransport).toBe(0);
    expect(data.summary.totalPayments).toBe(0);
    expect(data.summary.totalPaidAmount).toBe(0);
  });

  it("strictly prohibits Farmer B from viewing Farmer A's history (403 FORBIDDEN)", async () => {
    const res = await fetch(`${baseUrl}/farmers/${farmerAId}/history`, {
      headers: { Authorization: `Bearer ${farmerBToken}` },
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("FORBIDDEN");
  });

  it("reflects newly booked procurement slots in History", async () => {
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newFarmerToken}`,
      },
      body: JSON.stringify({
        centreId: 1,
        slotId: 3,
        paddyVariety: "Tomato — Hybrid Roma",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 25,
      }),
    });

    expect(bookRes.status).toBe(201);
    const bookData = await bookRes.json();
    const bookingCode = bookData.booking.bookingCode;

    // Fetch history
    const historyRes = await fetch(`${baseUrl}/farmers/${newFarmerId}/history`, {
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });

    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.summary.totalBookings).toBe(1);
    expect(historyData.summary.activeBookings).toBe(1);

    const bookingItem = historyData.timeline.find((i: any) => i.code === bookingCode);
    expect(bookingItem).toBeDefined();
    expect(bookingItem.type).toBe("BOOKING");
    expect(bookingItem.crop).toBe("Tomato — Hybrid Roma");
    expect(bookingItem.quantity).toBe(25);
    expect(bookingItem.status).toBe("ACTIVE");
    expect(bookingItem.tokenNumber).toBeDefined();
  });

  it("reflects transportation bookings in History", async () => {
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newFarmerToken}`,
      },
      body: JSON.stringify({
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Muppalapally Village",
        destinationCentreId: 1,
        scheduledDate: "2026-03-20",
        timeSlot: "10:00 AM - 12:00 PM",
        estimatedLoadQuintals: 25,
        distanceKm: 8,
      }),
    });

    expect(transportRes.status).toBe(201);
    const transportData = await transportRes.json();
    const transportCode = transportData.transport.transportCode;

    // Fetch history
    const historyRes = await fetch(`${baseUrl}/farmers/${newFarmerId}/history`, {
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });

    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.summary.totalTransport).toBe(1);

    const transportItem = historyData.timeline.find((i: any) => i.code === transportCode);
    expect(transportItem).toBeDefined();
    expect(transportItem.type).toBe("TRANSPORT");
    expect(["REQUESTED", "ASSIGNED"]).toContain(transportItem.status);
  });

  it("reflects cancellations in History accurately", async () => {
    // Get active booking for new farmer
    const historyBeforeRes = await fetch(`${baseUrl}/farmers/${newFarmerId}/history`, {
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });
    const historyBefore = await historyBeforeRes.json();
    const bookingToCancel = historyBefore.bookings[0];
    expect(bookingToCancel).toBeDefined();

    // Cancel the booking
    const cancelRes = await fetch(`${baseUrl}/bookings/${bookingToCancel.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });

    expect(cancelRes.status).toBe(200);

    // Fetch history again to verify cancellation status
    const historyAfterRes = await fetch(`${baseUrl}/farmers/${newFarmerId}/history`, {
      headers: { Authorization: `Bearer ${newFarmerToken}` },
    });
    const historyAfter = await historyAfterRes.json();

    const cancelledBooking = historyAfter.timeline.find((i: any) => i.code === bookingToCancel.bookingCode);
    expect(cancelledBooking).toBeDefined();
    expect(cancelledBooking.status).toBe("CANCELLED");
    expect(historyAfter.summary.activeBookings).toBe(0);
  });
});
