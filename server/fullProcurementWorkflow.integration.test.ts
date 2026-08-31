import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { registrations, bookings, procurements, payments, transportBookings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Complete End-to-End Role-Based Procurement Workflow", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let farmerToken: string;
  let farmerId: number;
  let headOfficerToken: string;
  let logisticsOfficerToken: string;
  let qcInspectorToken: string;
  let paymentOfficerToken: string;

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

    // 1. Authenticate Head Officer
    const headRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });
    expect(headRes.status).toBe(200);
    const headData = await headRes.json();
    headOfficerToken = headData.accessToken || headData.token;

    // 2. Authenticate Logistics Officer
    const logRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "LOG-2026-1042", password: "Officer@2026" }),
    });
    expect(logRes.status).toBe(200);
    const logData = await logRes.json();
    logisticsOfficerToken = logData.accessToken || logData.token;

    // 3. Authenticate QC Inspector
    const qcRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "QC-2026-4892", password: "Officer@2026" }),
    });
    expect(qcRes.status).toBe(200);
    const qcData = await qcRes.json();
    qcInspectorToken = qcData.accessToken || qcData.token;

    // 4. Authenticate Payment Officer
    const payRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "PAY-2026-9041", password: "Officer@2026" }),
    });
    expect(payRes.status).toBe(200);
    const payData = await payRes.json();
    paymentOfficerToken = payData.accessToken || payData.token;
  });

  afterAll(() => {
    if (server) server.close();
  });

  it("executes the full procurement pipeline seamlessly from farmer booking to DBT bank credit", async () => {
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    // STEP 1: Farmer Registration
    const regRes = await fetch(`${baseUrl}/farmers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Venkata Rao",
        phone: testPhone,
        password: "Farmer@2026",
        village: "Muppalapally",
        district: "Guntur",
        primaryCrop: "Paddy (Grade A)",
        aadhaarMasked: "XXXX XXXX 8821",
        declarationAccepted: true,
      }),
    });
    expect([201, 409]).toContain(regRes.status);
    const regData = await regRes.json();
    farmerId = regData.farmer.id;

    // STEP 2: Officer Approves Farmer Registration
    const db = await getDb();
    const regRecord = (await db!.select().from(registrations).where(eq(registrations.farmerId, farmerId)).limit(1))[0];
    expect(regRecord).toBeDefined();

    const approveRes = await fetch(`${baseUrl}/officers/registrations/${regRecord.id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });
    expect(approveRes.status).toBe(200);

    // STEP 3: Farmer Login
    const loginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, password: "Farmer@2026" }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    farmerToken = loginData.accessToken || loginData.token;

    // STEP 4: Farmer Books Slot
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        centreId: 1,
        slotId: 1,
        paddyVariety: "Paddy — Grade A (Fine)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 20,
      }),
    });
    expect(bookRes.status).toBe(201);
    const bookData = await bookRes.json();
    const bookingId = bookData.booking.id;
    expect(bookingId).toBeGreaterThan(0);

    // STEP 5: Farmer Books Subsidized Transport
    const transportRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Muppalapally",
        destinationCentreId: 1,
        scheduledDate: "2026-03-18",
        timeSlot: "08:00 AM – 11:00 AM",
        estimatedLoadQuintals: 20,
        distanceKm: 8.5,
      }),
    });
    expect(transportRes.status).toBe(201);
    const transportData = await transportRes.json();
    const transportCode = transportData.transport.transportCode;
    expect(transportCode).toMatch(/^TR-/);

    // STEP 6: Logistics Officer Dispatches Transport (IN_TRANSIT)
    const transitRes = await fetch(`${baseUrl}/officers/transport/${transportCode}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${logisticsOfficerToken}`,
      },
      body: JSON.stringify({
        status: "IN_TRANSIT",
        driverName: "Srinivasa Rao",
        vehicleNumber: "AP 07 TX 4821",
      }),
    });
    expect(transitRes.status).toBe(200);
    const transitData = await transitRes.json();
    expect(transitData.transport.status).toBe("IN_TRANSIT");

    // STEP 7: Logistics Marks Transport DELIVERED_AT_CENTRE -> Triggers QC Queue
    const deliverRes = await fetch(`${baseUrl}/officers/transport/${transportCode}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${logisticsOfficerToken}`,
      },
      body: JSON.stringify({ status: "DELIVERED_AT_CENTRE" }),
    });
    expect(deliverRes.status).toBe(200);
    const deliverData = await deliverRes.json();
    expect(deliverData.transport.status).toBe("DELIVERED_AT_CENTRE");

    // Verify linked procurement auto-advanced to QUALITY_CHECK
    const procAfterDelivery = (await db!.select().from(procurements).where(eq(procurements.bookingId, bookingId)).limit(1))[0];
    expect(procAfterDelivery).toBeDefined();
    expect(procAfterDelivery.status).toBe("QUALITY_CHECK");

    // STEP 8: Quality Control Inspector Inspects Crop & Submits Certified QC
    const qcInspectionRes = await fetch(`${baseUrl}/officers/procurement/${bookingId}/qc-inspection`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${qcInspectorToken}`,
      },
      body: JSON.stringify({
        qualityGrade: "Grade A Fine (FAQ)",
        qcResult: "ACCEPTED",
        weighedQuantityQuintals: 21.50,
        moisturePercent: 13.6,
        foreignMatterPercent: 0.8,
        remarks: "Sample lab tested. Moisture 13.6% within permissible 17.0% limit. Excellent grain uniformity.",
      }),
    });
    expect(qcInspectionRes.status).toBe(200);
    const qcData = await qcInspectionRes.json();
    expect(qcData.qcResult).toBe("ACCEPTED");

    // Verify procurement record has certified weighed weight and grade
    const procAfterQc = (await db!.select().from(procurements).where(eq(procurements.bookingId, bookingId)).limit(1))[0];
    expect(procAfterQc.qualityGrade).toBe("Grade A Fine (FAQ)");
    expect(Number(procAfterQc.weighedQuantityQuintals)).toBe(21.5);

    // STEP 9: Authorized Officer Disburses Official MSP Payout
    const payoutRes = await fetch(`${baseUrl}/officers/procurement/${bookingId}/payout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paymentOfficerToken}`,
      },
    });
    expect(payoutRes.status).toBe(201);
    const payoutData = await payoutRes.json();
    expect(payoutData.message).toContain("payout initiated and credited successfully");
    expect(payoutData.payment.status).toBe("SUCCESS");
    expect(payoutData.payment.gateway).toBe("GOVT_DBT_DIRECT_CREDIT");

    // Verify duplicate payout is blocked
    const duplicatePayoutRes = await fetch(`${baseUrl}/officers/procurement/${bookingId}/payout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paymentOfficerToken}`,
      },
    });
    expect(duplicatePayoutRes.status).toBe(409);

    // STEP 10: Verify Completed Procurement and DBT Payment in Database
    const finalProc = (await db!.select().from(procurements).where(eq(procurements.bookingId, bookingId)).limit(1))[0];
    expect(finalProc.status).toBe("COMPLETED");

    const finalBooking = (await db!.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0];
    expect(finalBooking.status).toBe("COMPLETED");

    const finalPayment = (await db!.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1))[0];
    expect(finalPayment).toBeDefined();
    expect(finalPayment.status).toBe("SUCCESS");
    expect(Number(finalPayment.amount)).toBeGreaterThan(45000);

    // STEP 11: Farmer Views Payments & Notifications
    const farmerPaymentsRes = await fetch(`${baseUrl}/farmers/${farmerId}/payments`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(farmerPaymentsRes.status).toBe(200);
    const farmerPayData = await farmerPaymentsRes.json();
    expect(farmerPayData.payments.length).toBeGreaterThan(0);
    expect(farmerPayData.payments[0].status).toBe("SUCCESS");

    const farmerNotifsRes = await fetch(`${baseUrl}/farmers/${farmerId}/notifications`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(farmerNotifsRes.status).toBe(200);
    const farmerNotifsData = await farmerNotifsRes.json();
    const notifs = farmerNotifsData.notifications;
    expect(notifs.some((n: { category: string }) => n.category === "PAYMENT")).toBe(true);
    expect(notifs.some((n: { category: string }) => n.category === "TRANSPORT")).toBe(true);
  });
});
