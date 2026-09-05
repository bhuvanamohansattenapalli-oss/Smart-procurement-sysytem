import { describe, expect, it, beforeAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { otpChallenges } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Smart Procurement End-to-End Core Workflow", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

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

    return () => {
      server.close();
    };
  });

  it("completes the full farmer registration, officer approval, booking, queue, procurement, payment and analytics cycle", async () => {
    const testPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Farmer directly submits registration (no OTP)
    const regRes = await fetch(`${baseUrl}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Suresh Gowda",
        phone: testPhone,
        password: "Farmer@Secure2026",
        village: "Ankapur",
        district: "Nizamabad",
        primaryCrop: "Paddy",
        aadhaarMasked: "XXXX XXXX 9988",
        declarationAccepted: true,
      }),
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    expect(regData.farmer.status).toBe("PENDING");
    const newFarmerId = regData.farmer.id;

    // 2. Farmer cannot log in yet before officer approval
    const preApprovalLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: testPhone,
        password: "Farmer@Secure2026",
      }),
    });
    expect(preApprovalLoginRes.status).toBe(403);
    const preApprovalData = await preApprovalLoginRes.json();
    expect(preApprovalData.error).toBe("REGISTRATION_NOT_APPROVED");

    // 3. Officer logs in
    const officerLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officerCode: "OFF-NZM-104",
        password: "Officer@2026",
      }),
    });
    expect(officerLoginRes.status).toBe(200);
    const officerData = await officerLoginRes.json();
    const officerToken = officerData.accessToken;
    expect(officerToken).toBeDefined();

    // 4. Officer reviews pending registrations and sees new farmer
    const pendingRes = await fetch(`${baseUrl}/officers/registrations/pending`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(pendingRes.status).toBe(200);
    const pendingData = await pendingRes.json();
    const newReg = pendingData.registrations.find((r: any) => r.farmerId === newFarmerId);
    expect(newReg).toBeDefined();

    // 5. Officer approves the new farmer
    const approveRes = await fetch(`${baseUrl}/officers/registrations/${newReg.id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(approveRes.status).toBe(200);

    // 6. Approved Farmer can now log in with credentials
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: testPhone,
        password: "Farmer@Secure2026",
      }),
    });
    expect(farmerLoginRes.status).toBe(200);
    const farmerSession = await farmerLoginRes.json();
    const farmerToken = farmerSession.accessToken;
    expect(farmerToken).toBeDefined();

    // 7. Check centres and real slots
    const centresRes = await fetch(`${baseUrl}/centres`);
    expect(centresRes.status).toBe(200);
    const centresData = await centresRes.json();
    expect(centresData.centres.length).toBeGreaterThanOrEqual(8);
    // Verify Andhra Pradesh centre names and coordinates
    const guntur = centresData.centres.find((c: any) => c.name.includes("Guntur"));
    expect(guntur).toBeDefined();
    expect(guntur.latitude).toBeCloseTo(16.2970, 2);
    expect(guntur.longitude).toBeCloseTo(80.4350, 2);

    const vijayawada = centresData.centres.find((c: any) => c.name.includes("Vijayawada"));
    expect(vijayawada).toBeDefined();

    const slotsRes = await fetch(`${baseUrl}/centres/1/slots`);
    expect(slotsRes.status).toBe(200);
    const slotsData = await slotsRes.json();
    expect(slotsData.slots.length).toBeGreaterThan(0);
    const slotToBook = slotsData.slots[0];
    expect(slotToBook.id).toBeDefined();
    expect(slotToBook.capacity).toBeGreaterThan(0);

    // 8. Farmer creates booking
    const bookingRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        centreId: 1,
        slotId: slotToBook.id,
        paddyVariety: "Common paddy",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 20,
      }),
    });
    const bookingBodyText = await bookingRes.text();
    if (bookingRes.status !== 201) console.log("BOOKING ERROR BODY:", bookingBodyText);
    expect(bookingRes.status).toBe(201);
    const bookingData = JSON.parse(bookingBodyText);
    expect(bookingData.booking.tokenNumber).toBeDefined();
    const bookingId = bookingData.booking.id;

    // 9. Check queue
    const queueRes = await fetch(`${baseUrl}/queue/${bookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(queueRes.status).toBe(200);
    const queueData = await queueRes.json();
    expect(queueData.status).toBe("WAITING");

    // 10. Officer lists all bookings
    const officerBookingsRes = await fetch(`${baseUrl}/officers/bookings`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(officerBookingsRes.status).toBe(200);
    const officerBookingsData = await officerBookingsRes.json();
    expect(officerBookingsData.bookings.some((b: any) => b.id === bookingId)).toBe(true);

    // 11. Officer updates procurement stage to WEIGHING and then COMPLETED
    const updateStageRes = await fetch(`${baseUrl}/procurement/${bookingId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: "COMPLETED",
        weighedQuantityQuintals: 19.8,
        qualityGrade: "Grade A",
      }),
    });
    expect(updateStageRes.status).toBe(200);

    // 12. Farmer checks procurement status
    const procRes = await fetch(`${baseUrl}/procurement/${bookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(procRes.status).toBe(200);
    const procData = await procRes.json();
    expect(procData.procurement.status).toBe("COMPLETED");
    expect(procData.procurement.weighedQuantityQuintals).toBe(19.8);

    // 13. Farmer initiates and completes payment
    const paymentCreateRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        method: "UPI",
      }),
    });
    expect(paymentCreateRes.status).toBe(201);
    const paymentCreated = await paymentCreateRes.json();
    const paymentId = paymentCreated.payment.paymentId;

    const paymentCompleteRes = await fetch(`${baseUrl}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        outcome: "SUCCESS",
      }),
    });
    expect(paymentCompleteRes.status).toBe(200);
    const paymentCompleted = await paymentCompleteRes.json();
    expect(paymentCompleted.payment.status).toBe("SUCCESS");

    // 14. Officer Analytics
    const analyticsRes = await fetch(`${baseUrl}/analytics/officer`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(analyticsRes.status).toBe(200);
    const analyticsData = await analyticsRes.json();
    expect(analyticsData.analytics.totalFarmers).toBeGreaterThan(0);
    expect(analyticsData.analytics.centreUtilization.length).toBeGreaterThanOrEqual(8);
    expect(analyticsData.analytics.financials.completedPaymentsCount).toBeGreaterThan(0);

    // 16. Government Crop Prices & MSP API
    const cropPricesRes = await fetch(`${baseUrl}/crop-prices`);
    expect(cropPricesRes.status).toBe(200);
    const cropPricesData = await cropPricesRes.json();
    expect(cropPricesData.prices.length).toBeGreaterThanOrEqual(10);
    const paddyPrice = cropPricesData.prices.find((p: any) => p.cropName === "Paddy (Grade A)");
    expect(paddyPrice).toBeDefined();
    expect(paddyPrice.mspPerQuintal).toBe(2320);
    expect(paddyPrice.govtBonusPerQuintal).toBe(50);
    expect(paddyPrice.effectiveRatePerQuintal).toBe(2370);

    // 17. Crop Transportation Options & Booking with 30% Govt Subsidy
    const transportOptionsRes = await fetch(`${baseUrl}/transport/options`);
    expect(transportOptionsRes.status).toBe(200);
    const transportOptionsData = await transportOptionsRes.json();
    expect(transportOptionsData.options.length).toBe(3);
    expect(transportOptionsData.subsidyPercent).toBe(30);

    const transportBookRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Ankapur",
        destinationCentreId: 1,
        scheduledDate: "2026-03-18",
        timeSlot: "08:00 AM – 11:00 AM",
        estimatedLoadQuintals: 20,
        distanceKm: 12,
      }),
    });
    expect(transportBookRes.status).toBe(201);
    const transportBookData = await transportBookRes.json();
    expect(transportBookData.transport.transportCode).toMatch(/^TR-2026-\d{4}$/);
    expect(transportBookData.transport.driverName).toBeDefined();
    expect(transportBookData.transport.vehicleNumber).toBeDefined();
    expect(transportBookData.transport.subsidyAmount).toBeGreaterThan(0);
    expect(transportBookData.transport.netPayable).toBeLessThan(transportBookData.transport.baseFare);
    const initialTransportCode = transportBookData.transport.transportCode;

    // Idempotency check: Booking with identical parameters immediately returns the existing booking
    const duplicateBookRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Ankapur",
        destinationCentreId: 1,
        scheduledDate: "2026-03-18",
        timeSlot: "08:00 AM – 11:00 AM",
        estimatedLoadQuintals: 20,
        distanceKm: 12,
      }),
    });
    expect(duplicateBookRes.status).toBe(200);
    const duplicateBookData = await duplicateBookRes.json();
    expect(duplicateBookData.transport.transportCode).toBe(initialTransportCode);

    // 18. Farmer retrieves transport history
    const farmerTransportsRes = await fetch(`${baseUrl}/farmers/${newFarmerId}/transport`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(farmerTransportsRes.status).toBe(200);
    const farmerTransportsData = await farmerTransportsRes.json();
    expect(farmerTransportsData.transportBookings.length).toBe(1);

    // 19. Officer Quality Control Department Inspection & DBT Payout Flow on second booking
    const booking2Res = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        centreId: 1,
        slotId: slotsData.slots[1]?.id || slotToBook.id,
        paddyVariety: "BPT 5204 (Samba Mahsuri)",
        paddyGrade: "Grade A Fine",
        expectedQuantityQuintals: 25,
      }),
    });
    expect(booking2Res.status).toBe(201);
    const booking2Data = await booking2Res.json();
    const booking2Id = booking2Data.booking.id;

    const qcInspectRes = await fetch(`${baseUrl}/officers/procurement/${booking2Id}/qc-inspection`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        qualityGrade: "Grade A Fine (FAQ)",
        qcResult: "ACCEPTED",
        weighedQuantityQuintals: 25.0,
        moisturePercent: 14.5,
        foreignMatterPercent: 0.8,
        remarks: "Sample meets Fair Average Quality standards with optimal moisture content.",
      }),
    });
    expect(qcInspectRes.status).toBe(200);
    const qcInspectData = await qcInspectRes.json();
    expect(qcInspectData.qcResult).toBe("ACCEPTED");
    expect(qcInspectData.qualityGrade).toBe("Grade A Fine (FAQ)");

    // 20. Officer initiates Direct Bank Transfer (DBT) Payout for Farmer
    const payoutRes = await fetch(`${baseUrl}/officers/procurement/${booking2Id}/payout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
    });
    expect(payoutRes.status).toBe(201);
    const payoutData = await payoutRes.json();
    expect(payoutData.payment.status).toBe("SUCCESS");
    expect(payoutData.amount).toBeGreaterThan(0);

    // 21. Officer Logistics & Fleet Management
    const officerFleetRes = await fetch(`${baseUrl}/officers/transport`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(officerFleetRes.status).toBe(200);
    const officerFleetData = await officerFleetRes.json();
    expect(officerFleetData.transportBookings.some((t: any) => t.transportCode === initialTransportCode)).toBe(true);

    const updateFleetRes = await fetch(`${baseUrl}/officers/transport/${transportBookData.transport.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: "DELIVERED_AT_CENTRE",
      }),
    });
    expect(updateFleetRes.status).toBe(200);

    // 22. Dedicated Farmer Analytics
    const farmerAnalyticsRes = await fetch(`${baseUrl}/analytics/farmer`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    expect(farmerAnalyticsRes.status).toBe(200);
    const farmerAnalyticsData = await farmerAnalyticsRes.json();
    expect(farmerAnalyticsData.summary.totalBookings).toBeGreaterThanOrEqual(1);
    expect(farmerAnalyticsData.summary.priceRealizationPercent).toBeGreaterThan(0);
    expect(farmerAnalyticsData.cropBreakdown.length).toBeGreaterThanOrEqual(1);
    expect(farmerAnalyticsData.recentProcurements.length).toBeGreaterThanOrEqual(1);

    // 23. Verify pending registrations is now empty
    const finalPendingRes = await fetch(`${baseUrl}/officers/registrations/pending`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(finalPendingRes.status).toBe(200);
    const finalPendingData = await finalPendingRes.json();
    expect(finalPendingData.registrations.find((r: any) => r.farmerId === newFarmerId)).toBeUndefined();
  });
});
