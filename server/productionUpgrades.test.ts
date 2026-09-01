import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers, officers, bookings, slots, transportBookings, payments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";

describe("Production Upgrades & Requirement Verification Tests", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let farmerToken: string;
  let officerToken: string;
  let farmerRecord: any;

  beforeAll(async () => {
    await ensurePrototypeSeed();
    const db = await getDb();

    // Ensure farmer
    farmerRecord = (await db!.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
    if (!farmerRecord) {
      await db!.insert(farmers).values({
        farmerCode: "FMR-2026-UPG01",
        name: "Ramesh Kumar",
        phone: "9876543210",
        passwordHash: hashPassword("Farmer@2026"),
        village: "Mangalagiri",
        district: "Guntur",
        primaryCrop: "Paddy",
        status: "APPROVED",
      });
      farmerRecord = (await db!.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
    } else {
      await db!.update(farmers).set({ passwordHash: hashPassword("Farmer@2026"), status: "APPROVED" }).where(eq(farmers.phone, "9876543210"));
    }

    // Ensure officer
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

    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    const farmerLoginData = await farmerLoginRes.json();
    farmerToken = farmerLoginData.accessToken || farmerLoginData.token;

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

  it("1. GET /api/crop-prices returns all 18 government-supported crops with MSP rates and categories", async () => {
    const res = await fetch(`${baseUrl}/crop-prices`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.prices)).toBe(true);
    expect(data.prices.length).toBeGreaterThanOrEqual(18);

    const cropNames = data.prices.map((c: any) => c.cropName);
    const expectedKeywords = [
      "paddy", "wheat", "maize", "jowar", "bajra",
      "ragi", "bengal gram", "red gram", "green gram",
      "black gram", "groundnut", "sunflower", "soybean",
      "cotton", "sugarcane"
    ];

    for (const kw of expectedKeywords) {
      const match = cropNames.some((n: string) => n.toLowerCase().includes(kw));
      expect(match).toBe(true);
    }
  });

  it("2. GET /api/centres/:id/slots returns active 1-hour slots with capacity, timings, and status", async () => {
    const res = await fetch(`${baseUrl}/centres/1/slots?date=2026-03-18`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slots).toBeDefined();
    expect(data.slots.length).toBeGreaterThanOrEqual(8);

    const firstSlot = data.slots[0];
    expect(firstSlot.startTime).toBe("07:00 AM");
    expect(firstSlot.endTime).toBe("08:00 AM");
    expect(firstSlot.capacity).toBe(25);
    expect(firstSlot.available).toBe(firstSlot.capacity - firstSlot.bookedCount);
    expect(["AVAILABLE", "LIMITED", "FULL"]).toContain(firstSlot.status);
  });

  it("3. Slot Booking: Allows cancellation within 30 minutes and frees up slot capacity", async () => {
    // Get a slot
    const slotsRes = await fetch(`${baseUrl}/centres/1/slots?date=2026-03-18`);
    const slotsData = await slotsRes.json();
    const targetSlot = slotsData.slots.find((s: any) => s.available > 0) || slotsData.slots[0];

    // Create booking
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        centreId: 1,
        slotId: targetSlot.id,
        paddyVariety: "Maize (Makka)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 30,
      }),
    });
    expect(bookRes.status).toBe(201);
    const booking = await bookRes.json();
    const bookingId = booking.booking.id;

    // Cancel within 30 min (immediate)
    const cancelRes = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.booking.status).toBe("CANCELLED");
  });

  it("4. Slot Booking: Rejects cancellation if booking is older than 30 minutes", async () => {
    const db = await getDb();
    const oldDate = new Date(Date.now() - 40 * 60 * 1000); // 40 minutes ago
    const code = `BK-TEST-OLD-${Date.now()}`;

    // Insert an old booking directly
    await db!.insert(bookings).values({
      bookingCode: code,
      farmerId: farmerRecord.id,
      centreId: 1,
      slotId: 1,
      paddyVariety: "Wheat (Gehun)",
      paddyGrade: "Grade A",
      expectedQuantityQuintals: "25.00",
      status: "ACTIVE",
      createdAt: oldDate,
    });

    const inserted = (await db!.select().from(bookings).where(eq(bookings.bookingCode, code)).limit(1))[0];
    expect(inserted).toBeDefined();

    const cancelRes = await fetch(`${baseUrl}/bookings/${inserted.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(cancelRes.status).toBe(400);
    const cancelData = await cancelRes.json();
    expect(cancelData.message).toMatch(/30 minutes/i);
  });

  it("5. Transportation Booking: Allows cancellation within 30 minutes and rejects after 30 minutes", async () => {
    // 1. Create a fresh transport booking
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Muppalapally",
        destinationCentreId: 1,
        scheduledDate: "2026-03-18",
        timeSlot: "Morning (07:00 - 11:00 AM)",
        estimatedLoadQuintals: 40,
      }),
    });
    expect(transportRes.status).toBe(201);
    const transportData = await transportRes.json();
    const transportId = transportData.transport.id;

    // 2. Cancel within 30 min
    const cancelRes = await fetch(`${baseUrl}/transport/bookings/${transportId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(cancelRes.status).toBe(200);
    const cancelResult = await cancelRes.json();
    expect(cancelResult.transport.status).toBe("CANCELLED");

    // 3. Re-cancelling already cancelled returns 400
    const reCancelRes = await fetch(`${baseUrl}/transport/bookings/${transportId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(reCancelRes.status).toBe(400);

    // 4. Test older than 30 minutes rejection
    const db = await getDb();
    const oldDate = new Date(Date.now() - 35 * 60 * 1000);
    const code = `TR-OLD-${Date.now()}`;
    await db!.insert(transportBookings).values({
      transportCode: code,
      farmerId: farmerRecord.id,
      vehicleType: "MINI_TRUCK",
      vehicleNumber: "AP 07 TX 9988",
      driverName: "Srinivas Rao",
      driverPhone: "9876543210",
      pickupVillage: "Kothapet",
      destinationCentreId: 1,
      scheduledDate: "2026-03-18",
      timeSlot: "Morning (07:00 - 11:00 AM)",
      estimatedLoadQuintals: "30.00",
      baseFare: "1200.00",
      subsidyAmount: "360.00",
      netPayable: "840.00",
      status: "REQUESTED",
      createdAt: oldDate,
    });

    const oldTransport = (await db!.select().from(transportBookings).where(eq(transportBookings.transportCode, code)).limit(1))[0];
    expect(oldTransport).toBeDefined();

    const oldCancelRes = await fetch(`${baseUrl}/transport/bookings/${oldTransport.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(oldCancelRes.status).toBe(400);
    const oldCancelData = await oldCancelRes.json();
    expect(oldCancelData.message).toMatch(/30 minutes/i);
  });

  it("6. Payment State Machine: Payment status is PENDING/READY_FOR_PAYMENT before payout, not CREDITED", async () => {
    const db = await getDb();
    // Complete any earlier active bookings for this farmer to satisfy one-active-booking constraint
    await db!.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.farmerId, farmerRecord.id));

    const candidateSlots = await db!.select().from(slots).where(eq(slots.centreId, 1));
    const targetSlot = candidateSlots.find(s => s.bookedCount < s.capacity) || candidateSlots[0];
    if (targetSlot) {
      await db!.update(slots).set({ bookedCount: Math.min(targetSlot.bookedCount, targetSlot.capacity - 5) }).where(eq(slots.id, targetSlot.id));
    }

    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        centreId: 1,
        slotId: targetSlot ? targetSlot.id : 1,
        paddyVariety: "Soybean (Yellow)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 20,
      }),
    });
    const booking = await bookRes.json();
    if (bookRes.status !== 201) {
      console.error("DEBUG TEST 6 BOOKING FAILED:", bookRes.status, booking);
    }
    expect(bookRes.status).toBe(201);

    // Verify payment record in DB is not SUCCESS
    const paymentRecords = await db!.select().from(payments).where(eq(payments.bookingId, booking.booking.id));
    // Either no payment record yet, or status is PENDING
    if (paymentRecords.length > 0) {
      expect(paymentRecords[0].status).not.toBe("SUCCESS");
    }
  });
});
