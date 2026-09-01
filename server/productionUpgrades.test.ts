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
  }, 60000);

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

  it("3. Slot Booking: Allows cancellation >= 30 minutes before scheduled slot time and frees capacity", async () => {
    const db = await getDb();
    // Complete any active bookings
    await db!.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.farmerId, farmerRecord.id));

    // Create a future slot 48 hours from now
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const futureDateStr = futureDate.toISOString().split("T")[0];
    await db!.insert(slots).values({
      centreId: 1,
      slotDate: futureDateStr,
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      capacity: 25,
      bookedCount: 0,
      isActive: 1,
    });
    const futureSlot = (await db!.select().from(slots).where(eq(slots.slotDate, futureDateStr)).limit(1))[0];

    const initialBookedCount = futureSlot.bookedCount;

    // Create booking
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        centreId: 1,
        slotId: futureSlot.id,
        paddyVariety: "Maize (Makka)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 30,
      }),
    });
    expect(bookRes.status).toBe(201);
    const booking = await bookRes.json();
    const bookingId = booking.booking.id;

    // Check slot bookedCount increased
    const [slotAfterBook] = await db!.select().from(slots).where(eq(slots.id, futureSlot.id));
    expect(slotAfterBook.bookedCount).toBe(initialBookedCount + 1);

    // Cancel while >= 30 min before scheduled slot
    const cancelRes = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.booking.status).toBe("CANCELLED");

    // Check slot bookedCount decreased
    const [slotAfterCancel] = await db!.select().from(slots).where(eq(slots.id, futureSlot.id));
    expect(slotAfterCancel.bookedCount).toBe(initialBookedCount);
  });

  it("4. Slot Booking: Rejects cancellation if less than 30 minutes before scheduled slot or past", async () => {
    const db = await getDb();
    const pastDateStr = "2026-03-18"; // In the past
    await db!.insert(slots).values({
      centreId: 1,
      slotDate: pastDateStr,
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      capacity: 25,
      bookedCount: 1,
      isActive: 1,
    });
    const pastSlot = (await db!.select().from(slots).where(eq(slots.slotDate, pastDateStr)).limit(1))[0];

    const pastBookingCode = `BK-TEST-PAST-${Date.now()}`;
    await db!.insert(bookings).values({
      bookingCode: pastBookingCode,
      farmerId: farmerRecord.id,
      centreId: 1,
      slotId: pastSlot.id,
      paddyVariety: "Wheat (Gehun)",
      paddyGrade: "Grade A",
      expectedQuantityQuintals: "25.00",
      status: "ACTIVE",
    });
    const pastBooking = (await db!.select().from(bookings).where(eq(bookings.bookingCode, pastBookingCode)).limit(1))[0];

    const cancelRes = await fetch(`${baseUrl}/bookings/${pastBooking.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(cancelRes.status).toBe(400);
    const cancelData = await cancelRes.json();
    expect(cancelData.error).toBe("CANCELLATION_DEADLINE_EXCEEDED");
    expect(cancelData.message).toMatch(/30 minutes/i);
  });

  it("5. Transportation Booking: Allows cancellation >= 30 mins before pickup and rejects when past deadline", async () => {
    const futureDateStr = new Date(Date.now() + 48 * 3600 * 1000).toISOString().split("T")[0];

    // 1. Create a future transport booking
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Muppalapally",
        destinationCentreId: 1,
        scheduledDate: futureDateStr,
        timeSlot: "Morning (07:00 - 11:00 AM)",
        estimatedLoadQuintals: 40,
      }),
    });
    expect([200, 201]).toContain(transportRes.status);
    const transportData = await transportRes.json();
    const transportId = transportData.transport.id;

    // 2. Cancel within allowed window
    const cancelRes = await fetch(`${baseUrl}/transport/bookings/${transportId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    if (cancelRes.status !== 200) {
      console.log("CANCEL RES FAIL IN TEST 5:", cancelRes.status, await cancelRes.json());
    }
    expect(cancelRes.status).toBe(200);
    const cancelResult = await cancelRes.json();
    expect(cancelResult.transport.status).toBe("CANCELLED");

    // 3. Re-cancelling already cancelled returns 400
    const reCancelRes = await fetch(`${baseUrl}/transport/bookings/${transportId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(reCancelRes.status).toBe(400);

    // 4. Past transport rejection
    const db = await getDb();
    const pastTransportCode = `TR-PAST-${Date.now()}`;
    await db!.insert(transportBookings).values({
      transportCode: pastTransportCode,
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
    });
    const pastTransport = (await db!.select().from(transportBookings).where(eq(transportBookings.transportCode, pastTransportCode)).limit(1))[0];

    const oldCancelRes = await fetch(`${baseUrl}/transport/bookings/${pastTransport.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(oldCancelRes.status).toBe(400);
    const oldCancelData = await oldCancelRes.json();
    expect(oldCancelData.error).toBe("CANCELLATION_DEADLINE_EXCEEDED");
    expect(oldCancelData.message).toMatch(/30 minutes/i);
  });

  it("6. Payment Lifecycle: Officer Initiate -> OFFICER_INITIATED -> Payout -> SUCCESS", async () => {
    const db = await getDb();
    // Complete existing bookings
    await db!.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.farmerId, farmerRecord.id));

    // Create fresh booking
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        centreId: 1,
        slotId: 1,
        paddyVariety: "Soybean (Yellow)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 20,
      }),
    });
    expect(bookRes.status).toBe(201);
    const bookData = await bookRes.json();
    const testBookingId = bookData.booking.id;

    // Step 1: Farmer checks status before officer action -> derived PENDING_OFFICER_INITIATION
    const initialPayRes = await fetch(`${baseUrl}/payments/${testBookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(initialPayRes.status).toBe(200);
    const initialPayData = await initialPayRes.json();
    expect(["PENDING", "PENDING_OFFICER_INITIATION"]).toContain(initialPayData.paymentStatus);

    // Step 2: Officer initiates payment
    const initiateRes = await fetch(`${baseUrl}/officers/procurement/${testBookingId}/initiate-payment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(initiateRes.status).toBe(200);
    const initiateData = await initiateRes.json();
    expect(initiateData.payment.status).toBe("OFFICER_INITIATED");
    expect(initiateData.payment.officerId).toBeDefined();
    expect(initiateData.payment.transactionReference).toBeDefined();

    // Step 3: Farmer portal reflects OFFICER_INITIATED without relogging
    const midPayRes = await fetch(`${baseUrl}/payments/${testBookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(midPayRes.status).toBe(200);
    const midPayData = await midPayRes.json();
    expect(midPayData.payment.status).toBe("OFFICER_INITIATED");

    // Step 4: Officer completes payout
    const payoutRes = await fetch(`${baseUrl}/officers/procurement/${testBookingId}/payout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect([200, 201]).toContain(payoutRes.status);
    const payoutData = await payoutRes.json();
    expect(payoutData.payment.status).toBe("SUCCESS");

    // Step 5: Farmer portal reflects SUCCESS
    const finalPayRes = await fetch(`${baseUrl}/payments/${testBookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(finalPayRes.status).toBe(200);
    const finalPayData = await finalPayRes.json();
    expect(finalPayData.payment.status).toBe("SUCCESS");
  });

  it("7. Phone Normalization: Accepts +91, spaces, dashes and correctly authenticates farmer", async () => {
    // Login with +91 98765-43210
    const loginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+91 98765-43210", password: "Farmer@2026" }),
    });
    expect(loginRes.status).toBe(200);
    const data = await loginRes.json();
    expect(data.accessToken).toBeDefined();
    expect(data.farmer.phone).toBe("9876543210");

    // Login with leading zero: 09876543210
    const loginZeroRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09876543210", password: "Farmer@2026" }),
    });
    expect(loginZeroRes.status).toBe(200);
  });

  it("8. India-Wide Centres: Supports state, district, cropCategory and search filters", async () => {
    // 1. Filter by Punjab
    const punjabRes = await fetch(`${baseUrl}/centres?state=Punjab`);
    expect(punjabRes.status).toBe(200);
    const punjabData = await punjabRes.json();
    expect(punjabData.centres.length).toBeGreaterThanOrEqual(1);
    for (const c of punjabData.centres) {
      expect(c.state).toBe("Punjab");
    }

    // 2. States list returned
    expect(Array.isArray(punjabData.states)).toBe(true);
    expect(punjabData.states.length).toBeGreaterThanOrEqual(10);
    expect(punjabData.states).toContain("Punjab");
    expect(punjabData.states).toContain("Andhra Pradesh");

    // 3. Search query
    const searchRes = await fetch(`${baseUrl}/centres?search=Ludhiana`);
    expect(searchRes.status).toBe(200);
    const searchData = await searchRes.json();
    expect(searchData.centres.length).toBeGreaterThanOrEqual(1);
    expect(searchData.centres[0].name.toLowerCase()).toContain("ludhiana");
  });

  it("9. Officer Farmers Directory: Returns registered farmers without password hashes", async () => {
    const res = await fetch(`${baseUrl}/officers/farmers`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.farmers)).toBe(true);
    expect(data.farmers.length).toBeGreaterThanOrEqual(1);
    expect(data.total).toBeDefined();

    // Verify zero password hashes
    const stringified = JSON.stringify(data.farmers);
    expect(stringified).not.toContain("passwordHash");
    expect(stringified).not.toContain("Farmer@2026");
    expect(stringified).not.toContain("Officer@2026");

    const firstFarmer = data.farmers[0];
    expect(firstFarmer.farmerCode).toBeDefined();
    expect(firstFarmer.name).toBeDefined();
    expect(firstFarmer.phone).toBeDefined();
    expect(firstFarmer.status).toBeDefined();
  });

  it("10. Payout Settlement: Officer DBT payout transitions state to SUCCESS (CREDITED)", async () => {
    const db = await getDb();
    // Complete existing bookings
    await db!.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.farmerId, farmerRecord.id));

    // Create fresh booking
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        centreId: 1,
        slotId: 1,
        paddyVariety: "Paddy (Common)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 25,
      }),
    });
    expect(bookRes.status).toBe(201);
    const bookData = await bookRes.json();
    const testBookingId = bookData.booking.id;

    // Trigger officer payout
    const payoutRes = await fetch(`${baseUrl}/officers/procurement/${testBookingId}/payout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect([200, 201]).toContain(payoutRes.status);
    const payoutData = await payoutRes.json();
    expect(payoutData.payment.status).toBe("SUCCESS");
    expect(payoutData.payment.transactionReference).toContain("DBT");

    // Re-trigger payout should return 409 already successful
    const duplicatePayoutRes = await fetch(`${baseUrl}/officers/procurement/${testBookingId}/payout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(duplicatePayoutRes.status).toBe(409);
  });
});

