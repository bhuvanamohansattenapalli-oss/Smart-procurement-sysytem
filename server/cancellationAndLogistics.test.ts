import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers, officers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";

describe("Slot & Transportation 30-Minute Cancellation and Logistics Tests", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let farmerToken: string;
  let officerToken: string;

  beforeAll(async () => {
    await ensurePrototypeSeed();
    const db = await getDb();

    // Ensure farmer exists and has known password & approved status
    let testFarmer = (await db!.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
    if (!testFarmer) {
      await db!.insert(farmers).values({
        farmerCode: "FMR-2026-LOG01",
        name: "Ramesh Kumar",
        phone: "9876543210",
        passwordHash: hashPassword("Farmer@2026"),
        village: "Mangalagiri",
        district: "Guntur",
        primaryCrop: "Paddy",
        status: "APPROVED",
      });
    } else {
      await db!.update(farmers).set({ passwordHash: hashPassword("Farmer@2026"), status: "APPROVED" }).where(eq(farmers.phone, "9876543210"));
    }

    // Ensure officer exists and has known password & active status
    let testOfficer = (await db!.select().from(officers).where(eq(officers.officerCode, "OFF-NZM-104")).limit(1))[0];
    if (testOfficer) {
      await db!.update(officers).set({ passwordHash: hashPassword("Officer@2026"), status: "ACTIVE" }).where(eq(officers.officerCode, "OFF-NZM-104"));
    }

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

    // 1. Authenticate Farmer
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    const farmerLoginData = await farmerLoginRes.json();
    farmerToken = farmerLoginData.accessToken || farmerLoginData.token;

    // 2. Authenticate Officer
    const officerLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });
    const officerLoginData = await officerLoginRes.json();
    officerToken = officerLoginData.accessToken || officerLoginData.token;
  });

  afterAll(() => {
    if (server) server.close();
  });

  it("should successfully cancel a fresh slot booking within 30 minutes", async () => {
    // 1. Fetch available slot
    const slotsRes = await fetch(`${baseUrl}/centres/1/slots`);
    const slotsData = await slotsRes.json();
    const targetSlot = slotsData.slots[0];
    expect(targetSlot).toBeDefined();

    // 2. Create a fresh booking
    const bookingRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        centreId: 1,
        slotId: targetSlot.id,
        paddyVariety: "Common paddy",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 20,
      }),
    });

    expect(bookingRes.status).toBe(201);
    const bookingData = await bookingRes.json();
    const bookingId = bookingData.booking.id;
    expect(bookingId).toBeDefined();

    // 3. Cancel booking within 30 mins
    const cancelRes = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
      },
    });

    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.success).toBe(true);
    expect(cancelData.booking.status).toBe("CANCELLED");
  });

  it("should successfully book and cancel a transportation booking within 30 minutes", async () => {
    // 1. Book transportation
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Muppalapally",
        destinationCentreId: 1,
        scheduledDate: "2026-03-20",
        timeSlot: "10:00 AM – 01:00 PM",
        estimatedLoadQuintals: 18,
        distanceKm: 12,
      }),
    });

    expect(transportRes.status).toBe(201);
    const transportData = await transportRes.json();
    const transportId = transportData.transport.id;
    expect(transportId).toBeDefined();

    // 2. Cancel transportation within 30 mins
    const cancelRes = await fetch(`${baseUrl}/transport/${transportId}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
      },
    });

    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.success).toBe(true);
    expect(cancelData.transport.status).toBe("CANCELLED");
  });

  it("should prevent updating status of a cancelled transport booking to IN_TRANSIT or DELIVERED_AT_CENTRE", async () => {
    // 1. Book and cancel
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        vehicleType: "MINI_TRUCK",
        pickupVillage: "Nizamabad North",
        destinationCentreId: 1,
        scheduledDate: "2026-03-22",
        timeSlot: "01:00 PM – 04:00 PM",
        estimatedLoadQuintals: 15,
        distanceKm: 8,
      }),
    });

    const transportData = await transportRes.json();
    const transportId = transportData.transport.id;

    await fetch(`${baseUrl}/transport/${transportId}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
      },
    });

    // 2. Officer attempts to update cancelled transport to IN_TRANSIT
    const updateRes = await fetch(`${baseUrl}/officers/transport/${transportId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: "IN_TRANSIT" }),
    });

    expect(updateRes.status).toBe(400);
    const updateData = await updateRes.json();
    expect(updateData.message).toContain("cancelled");
  });

  it("should verify analytics endpoints provide workflowStatusCounts and transportStatusCounts", async () => {
    const farmerAnalyticsRes = await fetch(`${baseUrl}/analytics/farmer`, {
      headers: {
        Authorization: `Bearer ${farmerToken}`,
      },
    });

    expect(farmerAnalyticsRes.status).toBe(200);
    const farmerAnalyticsData = await farmerAnalyticsRes.json();
    expect(farmerAnalyticsData.summary).toBeDefined();
    expect(farmerAnalyticsData.workflowStatusCounts).toBeDefined();
    expect(farmerAnalyticsData.transportStatusCounts).toBeDefined();

    const officerAnalyticsRes = await fetch(`${baseUrl}/analytics/officer`, {
      headers: {
        Authorization: `Bearer ${officerToken}`,
      },
    });

    expect(officerAnalyticsRes.status).toBe(200);
    const officerAnalyticsData = await officerAnalyticsRes.json();
    expect(officerAnalyticsData.analytics.workflowStatusCounts).toBeDefined();
    expect(officerAnalyticsData.analytics.transportStatusCounts).toBeDefined();
  });
});
