import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers, officers, bookings, slots, transportBookings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";

async function run() {
  console.log("==================================================");
  console.log("VERIFYING ONLY THE TWO TARGET ISSUES");
  console.log("==================================================");

  await ensurePrototypeSeed();
  const db = await getDb();

  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const farmerCode = `FMR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  await db!.insert(farmers).values({
    farmerCode,
    name: "Verification Farmer",
    phone: testPhone,
    passwordHash: hashPassword("Farmer@2026"),
    village: "Muppalapally",
    district: "Nizamabad",
    primaryCrop: "Paddy",
    status: "APPROVED",
  });

  const farmer = (await db!.select().from(farmers).where(eq(farmers.phone, testPhone)).limit(1))[0];

  const app = express();
  app.use(express.json());
  app.use("/api", createProcurementApi());

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // 1. Farmer Login
  const fLoginRes = await fetch(`${baseUrl}/farmers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: testPhone, password: "Farmer@2026" }),
  });
  const fLoginData = await fLoginRes.json();
  const farmerToken = fLoginData.accessToken;
  console.log("✓ Farmer logged in successfully, farmerId:", farmer.id);

  // 2. Officer Login
  const oLoginRes = await fetch(`${baseUrl}/officers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
  });
  const oLoginData = await oLoginRes.json();
  const officerToken = oLoginData.accessToken;
  console.log("✓ Officer logged in successfully");

  // Ensure slot 1 has capacity
  await db!.update(slots).set({ bookedCount: 0 }).where(eq(slots.id, 1));

  // -------------------------------------------------------------
  // ISSUE 1: PROCUREMENT STATUS NOT UPDATING
  // -------------------------------------------------------------
  console.log("\n--- TESTING ISSUE 1: PROCUREMENT STATUS UPDATES ---");
  const bookRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
    body: JSON.stringify({
      centreId: 1,
      slotId: 1,
      paddyVariety: "Paddy (Grade A)",
      paddyGrade: "Grade A",
      expectedQuantityQuintals: 25,
    }),
  });
  if (bookRes.status !== 201) {
    throw new Error(`Booking creation failed: ${bookRes.status} ${await bookRes.text()}`);
  }
  const bookData = await bookRes.json();
  const bookingId = bookData.booking.id;
  console.log("✓ Initial Booking created:", bookingId, "Initial procurement status:", bookData.booking.procurement.status);
  if (bookData.booking.procurement.status !== "BOOKED") {
    throw new Error(`Expected initial status BOOKED, got ${bookData.booking.procurement.status}`);
  }

  // Officer updates to ARRIVED
  const s1Res = await fetch(`${baseUrl}/procurement/${bookingId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
    body: JSON.stringify({ status: "ARRIVED" }),
  });
  if (s1Res.status !== 200) throw new Error(`Status update to ARRIVED failed: ${s1Res.status}`);
  console.log("✓ Officer changed status to ARRIVED");

  // Farmer polls/fetches without logging out
  const fCheck1 = await fetch(`${baseUrl}/bookings/${bookingId}`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const fData1 = await fCheck1.json();
  console.log("✓ Farmer GET /bookings/:id reflects updated status:", fData1.booking.procurement.status);
  if (fData1.booking.procurement.status !== "ARRIVED") throw new Error("Farmer did not see ARRIVED status!");

  // Officer updates to WEIGHING and sets weight & quality grade
  const s2Res = await fetch(`${baseUrl}/procurement/${bookingId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
    body: JSON.stringify({
      status: "WEIGHING",
      weighedQuantityQuintals: 24.5,
      qualityGrade: "Grade A Fine (FAQ)",
    }),
  });
  if (s2Res.status !== 200) throw new Error(`Status update to WEIGHING failed: ${s2Res.status}`);
  console.log("✓ Officer updated status to WEIGHING with quantity: 24.5 and grade: Grade A Fine (FAQ)");

  // Farmer polls/fetches again
  const fCheck2 = await fetch(`${baseUrl}/procurement/${bookingId}`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const fData2 = await fCheck2.json();
  console.log("✓ Farmer GET /procurement/:bookingId reflects updated status:", fData2.procurement.status, "weight:", fData2.procurement.weighedQuantityQuintals, "grade:", fData2.procurement.qualityGrade);
  if (fData2.procurement.status !== "WEIGHING" || fData2.procurement.weighedQuantityQuintals !== 24.5) {
    throw new Error("Farmer did not see WEIGHING status and weighed quantity!");
  }

  // Officer updates to COMPLETED
  const s3Res = await fetch(`${baseUrl}/procurement/${bookingId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
    body: JSON.stringify({ status: "COMPLETED" }),
  });
  if (s3Res.status !== 200) throw new Error(`Status update to COMPLETED failed: ${s3Res.status}`);
  console.log("✓ Officer updated status to COMPLETED");

  const fCheck3 = await fetch(`${baseUrl}/bookings/${bookingId}`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const fData3 = await fCheck3.json();
  console.log("✓ Farmer GET /bookings/:id reflects COMPLETED:", fData3.booking.procurement.status);
  if (fData3.booking.procurement.status !== "COMPLETED") throw new Error("Farmer did not see COMPLETED status!");

  // -------------------------------------------------------------
  // ISSUE 2A: TOKEN / SLOT CANCELLATION WINDOW & ACTION
  // -------------------------------------------------------------
  console.log("\n--- TESTING ISSUE 2A: TOKEN / SLOT CANCELLATION ---");
  // Mark previous booking completed so farmer can book another
  await db!.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.id, bookingId));
  await db!.update(slots).set({ bookedCount: 0 }).where(eq(slots.id, 1));

  const book2Res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
    body: JSON.stringify({
      centreId: 1,
      slotId: 1,
      paddyVariety: "Paddy (Grade A)",
      paddyGrade: "Grade A",
      expectedQuantityQuintals: 20,
    }),
  });
  const book2Data = await book2Res.json();
  const cancellableBookingId = book2Data.booking.id;
  const createdAt = new Date(book2Data.booking.createdAt).getTime();
  const deadline = new Date(book2Data.booking.cancellationDeadline).getTime();
  console.log("✓ Booking for cancellation created:", cancellableBookingId);
  console.log("  Creation Time:", new Date(createdAt).toISOString());
  console.log("  Cancellation Deadline:", new Date(deadline).toISOString());
  const diffMins = Math.round((deadline - createdAt) / (60 * 1000));
  console.log("  Difference in minutes:", diffMins);
  if (diffMins !== 30) {
    throw new Error(`Expected exactly 30 minutes from creation time, got ${diffMins} mins`);
  }
  if (!book2Data.booking.canCancel) {
    throw new Error("Expected canCancel to be true within 30-minute window!");
  }

  // Cancel the booking
  const cancelSlotRes = await fetch(`${baseUrl}/bookings/${cancellableBookingId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  if (cancelSlotRes.status !== 200) {
    throw new Error(`Cancel booking failed: ${cancelSlotRes.status} ${await cancelSlotRes.text()}`);
  }
  const cancelSlotData = await cancelSlotRes.json();
  console.log("✓ Cancel booking response status:", cancelSlotData.booking.status);
  if (cancelSlotData.booking.status !== "CANCELLED") {
    throw new Error("Expected booking status to be CANCELLED!");
  }

  // Verify browser refresh / persistence
  const refreshCheck = await fetch(`${baseUrl}/bookings/${cancellableBookingId}`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const refreshData = await refreshCheck.json();
  console.log("✓ Preserved on refresh GET /bookings/:id:", refreshData.booking.status);
  if (refreshData.booking.status !== "CANCELLED") {
    throw new Error("Cancelled state not preserved on refresh!");
  }

  // Double cancel rejection
  const reCancelRes = await fetch(`${baseUrl}/bookings/${cancellableBookingId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  console.log("✓ Double cancellation rejected with HTTP status:", reCancelRes.status);
  if (reCancelRes.status !== 400) throw new Error("Expected 400 on already cancelled booking!");

  // -------------------------------------------------------------
  // ISSUE 2B: TRANSPORTATION CANCELLATION WINDOW & ACTION
  // -------------------------------------------------------------
  console.log("\n--- TESTING ISSUE 2B: TRANSPORTATION CANCELLATION ---");
  const futureDateStr = new Date(Date.now() + 48 * 3600 * 1000).toISOString().split("T")[0];
  const tRes = await fetch(`${baseUrl}/transport/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
    body: JSON.stringify({
      vehicleType: "TRACTOR_TROLLEY",
      pickupVillage: "Muppalapally",
      destinationCentreId: 1,
      scheduledDate: futureDateStr,
      timeSlot: "Morning (07:00 - 11:00 AM)",
      estimatedLoadQuintals: 30,
    }),
  });
  if (tRes.status !== 201) throw new Error(`Transport booking failed: ${tRes.status} ${await tRes.text()}`);
  const tData = await tRes.json();
  const transportId = tData.transport.id;
  console.log("✓ Transportation booking created:", transportId, tData.transport.transportCode);

  // Check farmer transport list
  const tListRes = await fetch(`${baseUrl}/farmers/${farmer.id}/transport`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const tListData = await tListRes.json();
  const targetTransport = tListData.transportBookings.find((t: any) => t.id === transportId);
  if (!targetTransport) throw new Error("Created transport not found in list!");
  const tCreatedAt = new Date(targetTransport.createdAt).getTime();
  const tDeadline = new Date(targetTransport.cancellationDeadline).getTime();
  const tDiffMins = Math.round((tDeadline - tCreatedAt) / (60 * 1000));
  console.log("  Transport Created At:", new Date(tCreatedAt).toISOString());
  console.log("  Transport Deadline:", new Date(tDeadline).toISOString());
  console.log("  Transport Diff Mins:", tDiffMins);
  if (tDiffMins !== 30) throw new Error(`Expected 30 min window for transport, got ${tDiffMins}`);
  if (!targetTransport.canCancel) throw new Error("Expected transport canCancel to be true!");

  // Cancel transportation
  const cancelTRes = await fetch(`${baseUrl}/transport/${transportId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  if (cancelTRes.status !== 200) throw new Error(`Cancel transport failed: ${cancelTRes.status} ${await cancelTRes.text()}`);
  const cancelTData = await cancelTRes.json();
  console.log("✓ Cancel transport response status:", cancelTData.transport.status);
  if (cancelTData.transport.status !== "CANCELLED") throw new Error("Transport status is not CANCELLED!");

  // Verify persistence on refresh
  const tListRes2 = await fetch(`${baseUrl}/farmers/${farmer.id}/transport`, {
    headers: { Authorization: `Bearer ${farmerToken}`, "Cache-Control": "no-store" },
  });
  const tListData2 = await tListRes2.json();
  const targetTransport2 = tListData2.transportBookings.find((t: any) => t.id === transportId);
  console.log("✓ Preserved on refresh GET /farmers/:id/transport:", targetTransport2.status);
  if (targetTransport2.status !== "CANCELLED") throw new Error("Cancelled transport state not preserved!");

  // Double cancel rejection
  const reCancelTRes = await fetch(`${baseUrl}/transport/${transportId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  console.log("✓ Double transport cancellation rejected with HTTP status:", reCancelTRes.status);
  if (reCancelTRes.status !== 400) throw new Error("Expected 400 on already cancelled transport!");

  server.close();
  console.log("\n==================================================");
  console.log("ALL TARGET ISSUE TESTS PASSED PERFECTLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
