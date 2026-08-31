import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers, notifications, transportBookings } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { hashPassword } from "./services/passwordService";

describe("Logistics Status Submission & Notification Lifecycle", () => {
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
  });

  afterAll(() => {
    if (server) server.close();
  });

  it("executes the complete officer transport status update flow without errors, duplicates, or data loss", async () => {
    const db = await getDb();
    expect(db).toBeDefined();

    // 1. Seed or ensure a test farmer exists
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
      testFarmer = (await db!.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
    }

    // 2. Farmer authenticates and books transport
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
    });
    expect(farmerLoginRes.status).toBe(200);
    const farmerLoginData = await farmerLoginRes.json();
    const farmerToken = farmerLoginData.accessToken || farmerLoginData.token;

    const bookRes = await fetch(`${baseUrl}/transport/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        vehicleType: "MINI_TRUCK",
        pickupVillage: "Mangalagiri",
        destinationCentreId: 1,
        scheduledDate: "2026-09-05",
        timeSlot: "Morning (07:00 - 11:00 AM)",
        estimatedLoadQuintals: 30,
        distanceKm: 15,
      }),
    });
    expect([200, 201]).toContain(bookRes.status);
    const bookData = await bookRes.json();
    const transportRecord = bookData.transport;
    expect(transportRecord).toBeDefined();
    expect(transportRecord.id).toBeDefined();
    expect(transportRecord.transportCode).toBeDefined();

    const transportId = transportRecord.id;
    const transportCode = transportRecord.transportCode;

    // 3. Officer authenticates as Head Officer
    const officerLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });
    expect(officerLoginRes.status).toBe(200);
    const officerLoginData = await officerLoginRes.json();
    const officerToken = officerLoginData.accessToken || officerLoginData.token;

    // 4. Officer loads transport bookings
    const officerListRes = await fetch(`${baseUrl}/officers/transport`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(officerListRes.status).toBe(200);
    const officerListData = await officerListRes.json();
    expect(Array.isArray(officerListData.transportBookings)).toBe(true);
    const foundInList = officerListData.transportBookings.find((b: any) => b.id === transportId);
    expect(foundInList).toBeDefined();

    const countBeforeUpdates = (await db!.select().from(transportBookings)).length;

    // 5. Test Update by Numeric ID -> "IN_TRANSIT"
    const updateByIdRes = await fetch(`${baseUrl}/officers/transport/${transportId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: "IN_TRANSIT",
        driverName: "K. Mohan Reddy",
        driverPhone: "9848039218",
        vehicleNumber: "AP-16-PK-8812",
      }),
    });
    expect(updateByIdRes.status).toBe(200);
    const updateByIdData = await updateByIdRes.json();
    expect(updateByIdData.success).toBe(true);
    expect(updateByIdData.transport.status).toBe("IN_TRANSIT");

    // Verify DB record directly
    const dbRecord1 = (await db!.select().from(transportBookings).where(eq(transportBookings.id, transportId)).limit(1))[0];
    expect(dbRecord1.status).toBe("IN_TRANSIT");
    expect(dbRecord1.driverName).toBe("K. Mohan Reddy");

    // Verify Farmer received notification
    const farmerNotifs1 = await db!.select().from(notifications).where(eq(notifications.farmerId, testFarmer.id)).orderBy(desc(notifications.createdAt));
    expect(farmerNotifs1.length).toBeGreaterThan(0);
    expect(farmerNotifs1[0].title).toBe("Logistics Status Updated");
    expect(farmerNotifs1[0].message).toContain(transportCode);
    expect(farmerNotifs1[0].message).toContain("IN TRANSIT");

    // 6. Test Update by Transport Code ("TR-...") -> "DELIVERED_AT_CENTRE"
    const updateByCodeRes = await fetch(`${baseUrl}/officers/transport/${transportCode}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: "DELIVERED_AT_CENTRE",
      }),
    });
    expect(updateByCodeRes.status).toBe(200);
    const updateByCodeData = await updateByCodeRes.json();
    expect(updateByCodeData.success).toBe(true);
    expect(updateByCodeData.transport.status).toBe("DELIVERED_AT_CENTRE");

    // Verify DB record directly
    const dbRecord2 = (await db!.select().from(transportBookings).where(eq(transportBookings.id, transportId)).limit(1))[0];
    expect(dbRecord2.status).toBe("DELIVERED_AT_CENTRE");

    // Verify second notification
    const farmerNotifs2 = await db!.select().from(notifications).where(eq(notifications.farmerId, testFarmer.id)).orderBy(desc(notifications.createdAt));
    expect(farmerNotifs2[0].message).toContain("DELIVERED AT CENTRE");

    // 7. Test Case-Insensitivity & Status Normalization -> "assigned" -> "ASSIGNED"
    const updateCaseRes = await fetch(`${baseUrl}/officers/transport/${transportId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: "assigned",
      }),
    });
    expect(updateCaseRes.status).toBe(200);
    const dbRecord3 = (await db!.select().from(transportBookings).where(eq(transportBookings.id, transportId)).limit(1))[0];
    expect(dbRecord3.status).toBe("ASSIGNED");

    // 8. Confirm NO DUPLICATE bookings created during any status updates
    const countAfterUpdates = (await db!.select().from(transportBookings)).length;
    expect(countAfterUpdates).toBe(countBeforeUpdates);

    // 9. Negative Test: Invalid / Nonexistent Transport ID
    const notFoundRes = await fetch(`${baseUrl}/officers/transport/999999/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: "IN_TRANSIT" }),
    });
    expect(notFoundRes.status).toBe(404);

    // 10. Negative Test: Invalid status string
    const invalidStatusRes = await fetch(`${baseUrl}/officers/transport/${transportId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: "INVALID_STATUS_VALUE" }),
    });
    expect(invalidStatusRes.status).toBe(400);

    // 11. Negative Test: Missing auth token
    const noAuthRes = await fetch(`${baseUrl}/officers/transport/${transportId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_TRANSIT" }),
    });
    expect(noAuthRes.status).toBe(401);
  });
});
