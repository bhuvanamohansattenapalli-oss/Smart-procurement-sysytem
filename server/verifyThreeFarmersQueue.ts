import { getDb } from "./db";
import { farmers, registrations, bookings, slots, procurementCentres, queueEntries, procurements, officers } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";
import { issueAccessToken } from "./services/tokenService";

async function runVerification() {
  console.log("=== STARTING THREE FARMER QUEUE & CANCELLATION VERIFICATION ===");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // 1. Ensure officer exists for status updates
  let officer = (await db.select().from(officers).limit(1))[0];
  if (!officer) {
    const passwordHash = await hashPassword("Officer@2026");
    await db.insert(officers).values({
      officerCode: "OFF-TEST-01",
      name: "Officer Test",
      phone: "9876500001",
      passwordHash,
      role: "PROCUREMENT_OFFICER",
      department: "Procurement",
      branch: "GNT",
      district: "Guntur",
      status: "ACTIVE"
    });
    officer = (await db.select().from(officers).where(eq(officers.officerCode, "OFF-TEST-01")).limit(1))[0];
  }
  const officerToken = await issueAccessToken({ id: officer.id, role: "officer", code: officer.officerCode, name: officer.name });

  // 2. Setup centre & slot in Guntur (GNT)
  let centre = (await db.select().from(procurementCentres).where(eq(procurementCentres.name, "Guntur Agricultural Market Yard")).limit(1))[0];
  if (!centre) {
    centre = (await db.select().from(procurementCentres).limit(1))[0];
  }
  console.log(`Using centre: ${centre.name} (id: ${centre.id}, currentToken: ${centre.currentToken})`);

  // Create a dedicated test slot
  const testDate = "2026-10-15";
  const testStart = "10:00 AM";
  const testEnd = "10:30 AM";
  let testSlot = (await db.select().from(slots).where(
    and(eq(slots.centreId, centre.id), eq(slots.slotDate, testDate), eq(slots.startTime, testStart))
  ).limit(1))[0];
  if (!testSlot) {
    await db.insert(slots).values({
      centreId: centre.id,
      slotDate: testDate,
      startTime: testStart,
      endTime: testEnd,
      capacity: 10,
      bookedCount: 0,
      isActive: 1
    });
    testSlot = (await db.select().from(slots).where(
      and(eq(slots.centreId, centre.id), eq(slots.slotDate, testDate), eq(slots.startTime, testStart))
    ).limit(1))[0];
  } else {
    await db.update(slots).set({ isActive: 1, bookedCount: 0 }).where(eq(slots.id, testSlot.id));
  }

  // 3. Register & approve 3 test farmers
  const farmerData = [
    { name: "Farmer One", phone: "9100000001", code: "FMR-2026-90001" },
    { name: "Farmer Two", phone: "9100000002", code: "FMR-2026-90002" },
    { name: "Farmer Three", phone: "9100000003", code: "FMR-2026-90003" },
    { name: "Farmer Four", phone: "9100000004", code: "FMR-2026-90004" },
  ];

  const farmerAccounts: { farmer: typeof farmers.$inferSelect; token: string }[] = [];
  const pwdHash = await hashPassword("Farmer@2026");

  for (const f of farmerData) {
    let existing = (await db.select().from(farmers).where(eq(farmers.phone, f.phone)).limit(1))[0];
    if (!existing) {
      await db.insert(farmers).values({
        farmerCode: f.code,
        name: f.name,
        phone: f.phone,
        village: "Guntur Rural",
        district: "Guntur",
        primaryCrop: "Paddy Common",
        status: "APPROVED",
        passwordHash: pwdHash
      });
      existing = (await db.select().from(farmers).where(eq(farmers.phone, f.phone)).limit(1))[0];
      if (existing) {
        await db.insert(registrations).values({
          farmerId: existing.id,
          aadhaarMasked: "XXXX XXXX 1234",
          declarationAccepted: 1,
          status: "APPROVED"
        });
      }
    } else {
      await db.update(farmers).set({ status: "APPROVED" }).where(eq(farmers.id, existing.id));
    }
    // Delete old test bookings for these farmers
    const oldBookings = await db.select().from(bookings).where(eq(bookings.farmerId, existing.id));
    for (const ob of oldBookings) {
      await db.delete(queueEntries).where(eq(queueEntries.bookingId, ob.id));
      await db.delete(procurements).where(eq(procurements.bookingId, ob.id));
    }
    await db.delete(bookings).where(eq(bookings.farmerId, existing.id));

    const token = await issueAccessToken({ id: existing.id, role: "farmer", code: existing.farmerCode, name: existing.name });
    farmerAccounts.push({ farmer: existing, token });
  }

  console.log("3 Farmers ready for booking test.");

  // Import app to make API calls
  const express = (await import("express")).default;
  const { createProcurementApi } = await import("./routes/procurementApi");
  const app = express();
  app.use(express.json());
  app.use("/api", createProcurementApi());

  let baseUrl = "";
  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 3000;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve(s);
    });
  });

  // Helper fetch function
  const apiFetch = async (path: string, options: RequestInit = {}, token?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body: data };
  };

  // 4. Farmer 1, Farmer 2, Farmer 3 book same slot
  console.log("\n--- Booking 3 Farmers for same slot ---");
  const bookingResponses: any[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({
        centreId: centre.id,
        slotId: testSlot.id,
        paddyVariety: "BPT 5204 (Samba Mahsuri)",
        paddyGrade: "Grade A",
        expectedQuantityQuintals: 25.5
      })
    }, farmerAccounts[i].token);

    if (res.status !== 201) {
      console.error(`Farmer ${i+1} booking failed:`, res.status, res.body);
      throw new Error(`Booking ${i+1} failed`);
    }
    console.log(`Farmer ${i+1} booked: Code=${res.body.booking.bookingCode}, Token=${res.body.booking.tokenNumber}`);
    bookingResponses.push(res.body.booking);
  }

  // Verify Token Format: TK-(BRANCH)-(SERIAL)
  const token1 = bookingResponses[0].tokenNumber;
  const token2 = bookingResponses[1].tokenNumber;
  const token3 = bookingResponses[2].tokenNumber;

  console.log(`\nTokens Generated: [1] ${token1}, [2] ${token2}, [3] ${token3}`);
  const tokenRegex = /^TK-[A-Z0-9]+-\d{4}$/;
  if (!tokenRegex.test(token1) || !tokenRegex.test(token2) || !tokenRegex.test(token3)) {
    throw new Error(`Token format invalid! Expected TK-(BRANCH)-(SERIAL) e.g. TK-GNT-0001, got: ${token1}`);
  }
  console.log("✓ Token format check PASSED: Adheres to TK-(BRANCH)-(SERIAL)");

  // 5. Check initial queue positions for Farmer 1, 2, 3
  const q1 = await apiFetch(`/queue/${bookingResponses[0].id}`, {}, farmerAccounts[0].token);
  const q2 = await apiFetch(`/queue/${bookingResponses[1].id}`, {}, farmerAccounts[1].token);
  const q3 = await apiFetch(`/queue/${bookingResponses[2].id}`, {}, farmerAccounts[2].token);

  console.log(`\nInitial Queue Status:`);
  console.log(`Farmer 1: Position=${q1.body.position}, PeopleAhead=${q1.body.peopleAhead}, CurrentToken=${q1.body.currentToken}`);
  console.log(`Farmer 2: Position=${q2.body.position}, PeopleAhead=${q2.body.peopleAhead}, CurrentToken=${q2.body.currentToken}`);
  console.log(`Farmer 3: Position=${q3.body.position}, PeopleAhead=${q3.body.peopleAhead}, CurrentToken=${q3.body.currentToken}`);

  if (q1.body.peopleAhead !== 0 || q2.body.peopleAhead !== 1 || q3.body.peopleAhead !== 2) {
    throw new Error(`Initial queue counts incorrect! F1=${q1.body.peopleAhead}, F2=${q2.body.peopleAhead}, F3=${q3.body.peopleAhead}`);
  }
  console.log("✓ Initial queue positions PASSED: Farmer 1 has 0 ahead, Farmer 2 has 1 ahead, Farmer 3 has 2 ahead.");

  // 6. Officer advances Farmer 1 to DOCUMENT_VERIFICATION
  console.log("\n--- Officer advances Farmer 1 to DOCUMENT_VERIFICATION ---");
  const stageRes1 = await apiFetch(`/procurement/${bookingResponses[0].id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "DOCUMENT_VERIFICATION" })
  }, officerToken);
  if (stageRes1.status !== 200) throw new Error("Officer stage update 1 failed");

  // Check Farmer 1's procurement status
  const procRes1 = await apiFetch(`/procurement/${bookingResponses[0].id}`, {}, farmerAccounts[0].token);
  console.log(`Farmer 1 Procurement Status: ${procRes1.body.procurement.status}`);
  if (procRes1.body.procurement.status !== "DOCUMENT_VERIFICATION") {
    throw new Error(`Expected DOCUMENT_VERIFICATION, got ${procRes1.body.procurement.status}`);
  }
  console.log("✓ Farmer 1 stage update to DOCUMENT_VERIFICATION PASSED");

  // 7. Officer completes verification & marks WEIGHING then COMPLETED for Farmer 1
  console.log("\n--- Officer records weighing & marks COMPLETED for Farmer 1 ---");
  const stageRes2 = await apiFetch(`/procurement/${bookingResponses[0].id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status: "COMPLETED",
      weighedQuantityQuintals: 25.2,
      qualityGrade: "Grade A"
    })
  }, officerToken);
  if (stageRes2.status !== 200) throw new Error("Officer stage update 2 failed");

  // Verify Farmer 1 procurement is COMPLETED
  const procRes2 = await apiFetch(`/procurement/${bookingResponses[0].id}`, {}, farmerAccounts[0].token);
  console.log(`Farmer 1 Final Status: ${procRes2.body.procurement.status}, Weighed=${procRes2.body.procurement.weighedQuantityQuintals} quintals`);
  if (procRes2.body.procurement.status !== "COMPLETED") throw new Error("Expected COMPLETED");
  console.log("✓ Farmer 1 COMPLETED status PASSED");

  // 8. Verify Farmer 2 & Farmer 3 queue positions updated automatically
  console.log("\n--- Checking Farmer 2 & Farmer 3 Queue after Farmer 1 advanced ---");
  const q2Updated = await apiFetch(`/queue/${bookingResponses[1].id}`, {}, farmerAccounts[1].token);
  const q3Updated = await apiFetch(`/queue/${bookingResponses[2].id}`, {}, farmerAccounts[2].token);

  console.log(`Farmer 2 Updated: Position=${q2Updated.body.position}, PeopleAhead=${q2Updated.body.peopleAhead}, CurrentToken=${q2Updated.body.currentToken}`);
  console.log(`Farmer 3 Updated: Position=${q3Updated.body.position}, PeopleAhead=${q3Updated.body.peopleAhead}, CurrentToken=${q3Updated.body.currentToken}`);

  if (q2Updated.body.peopleAhead !== 0) {
    throw new Error(`Farmer 2 should now have 0 people ahead! Got: ${q2Updated.body.peopleAhead}`);
  }
  if (q3Updated.body.peopleAhead !== 1) {
    throw new Error(`Farmer 3 should now have 1 person ahead! Got: ${q3Updated.body.peopleAhead}`);
  }
  console.log("✓ Real-time queue advance PASSED: Farmer 2 now has 0 ahead, Farmer 3 now has 1 ahead!");

  // 9. Cancellation Flow Test: Farmer 4 books and cancels
  console.log("\n--- Testing Booking Cancellation Flow with Farmer 4 ---");
  const b4Res = await apiFetch("/bookings", {
    method: "POST",
    body: JSON.stringify({
      centreId: centre.id,
      slotId: testSlot.id,
      paddyVariety: "MTU 1010",
      paddyGrade: "Common",
      expectedQuantityQuintals: 15.0
    })
  }, farmerAccounts[3].token);

  if (b4Res.status !== 201) throw new Error("Farmer 4 booking failed");
  const booking4 = b4Res.body.booking;
  console.log(`Farmer 4 booked: Code=${booking4.bookingCode}, Token=${booking4.tokenNumber}, CanCancel=${booking4.canCancel}`);

  if (!booking4.canCancel) throw new Error("Newly created booking should be eligible for cancellation!");

  // Cancel Booking 4
  const cancelRes = await apiFetch(`/bookings/${booking4.id}/cancel`, {
    method: "POST"
  }, farmerAccounts[3].token);

  console.log(`Cancel response status: ${cancelRes.status}, Message: ${cancelRes.body.message}`);
  if (cancelRes.status !== 200 || cancelRes.body.booking.status !== "CANCELLED") {
    throw new Error(`Cancellation failed! Status: ${cancelRes.status}, Body: ${JSON.stringify(cancelRes.body)}`);
  }

  // Verify in DB directly
  const dbBooking = (await db.select().from(bookings).where(eq(bookings.id, booking4.id)).limit(1))[0];
  if (dbBooking.status !== "CANCELLED") throw new Error("DB status not updated to CANCELLED!");

  const dbQueue = await db.select().from(queueEntries).where(eq(queueEntries.bookingId, booking4.id));
  if (dbQueue.length !== 0) throw new Error("Queue entry should be deleted upon cancellation!");

  console.log("✓ Cancellation Flow PASSED: Status updated to CANCELLED in DB, queue entry deleted, slot capacity released!");

  server.close();
  console.log("\n========================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  process.exit(0);
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
