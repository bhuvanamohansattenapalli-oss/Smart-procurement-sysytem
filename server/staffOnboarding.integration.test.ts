import { describe, expect, it, beforeAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";

describe("Staff Onboarding + Head Officer Verification Lifecycle", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  let headOfficerToken: string;
  let registeredStaffId: number;
  let registeredEmployeeId: string;
  let registeredPendingCode: string;
  let generatedOfficerCode: string;
  let temporaryPassword: string;
  let qcOfficerToken: string;
  let activeBookingId: number;

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
      server?.close();
    };
  });

  it("1. Head Officer logs in and receives token with HEAD_OFFICER role", async () => {
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.officer.role).toBe("HEAD_OFFICER");
    headOfficerToken = data.accessToken;
  });

  it("2. New employee registers for onboarding (Quality Control Inspector)", async () => {
    const staffPhone = `9848${Math.floor(100000 + Math.random() * 900000)}`;
    registeredEmployeeId = `EMP-QC-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await fetch(`${baseUrl}/officers/staff/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headOfficerToken}`,
      },
      body: JSON.stringify({
        name: "S. Srinivas Reddy",
        employeeId: registeredEmployeeId,
        email: "s.srinivas@smartprocure.gov.in",
        phone: staffPhone,
        department: "Quality Control",
        role: "QUALITY_CONTROL_INSPECTOR",
        branch: "Guntur",
        centreId: 1,
        centreName: "Guntur Agricultural Market Yard",
        district: "Guntur",
        designation: "Senior Quality Inspector",
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe("PENDING_VERIFICATION");
    expect(data.staff.id).toBeDefined();
    registeredStaffId = data.staff.id;
    registeredPendingCode = data.staff.officerCode;
  });

  it("3. Unverified staff member login is rejected with 403 ACCOUNT_PENDING_VERIFICATION", async () => {
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: registeredEmployeeId, password: "AnyPassword@123" }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("ACCOUNT_PENDING_VERIFICATION");
  });

  it("4. Head Officer views pending staff onboarding requests", async () => {
    const res = await fetch(`${baseUrl}/officers/staff?status=PENDING_VERIFICATION`, {
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.staff)).toBe(true);
    const found = data.staff.find((s: any) => s.id === registeredStaffId);
    expect(found).toBeDefined();
    expect(found.status).toBe("PENDING_VERIFICATION");
  });

  it("5. Head Officer approves staff onboarding, generating Login ID and activation password", async () => {
    const res = await fetch(`${baseUrl}/officers/staff/${registeredStaffId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.officerCode).toBeDefined();
    expect(data.officerCode).toMatch(/^QC-2026-/);
    expect(data.temporaryPassword).toBeDefined();
    expect(data.staff.status).toBe("ACTIVE");

    generatedOfficerCode = data.officerCode;
    temporaryPassword = data.temporaryPassword;
  });

  it("6. Approved Quality Control Inspector signs in with generated Login ID and temporary password", async () => {
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: generatedOfficerCode, password: temporaryPassword }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.officer.role).toBe("QUALITY_CONTROL_INSPECTOR");
    qcOfficerToken = data.accessToken;
  });

  it("7. Quality Control Inspector can execute QC inspection on booking", async () => {
    // Check or create an active booking first
    const bookingsRes = await fetch(`${baseUrl}/officers/bookings`, {
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });
    const bookingsData = await bookingsRes.json();
    if (bookingsData.bookings?.length > 0) {
      activeBookingId = bookingsData.bookings[0].id;
    } else {
      // Farmer logs in and books a slot
      const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210", password: "Farmer@2026" }),
      });
      const farmerToken = (await farmerLoginRes.json()).accessToken;
      const slotsRes = await fetch(`${baseUrl}/centres/1/slots`);
      const slotsData = await slotsRes.json();
      const slotId = slotsData.slots?.[0]?.id || 1;

      const bookRes = await fetch(`${baseUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${farmerToken}`,
        },
        body: JSON.stringify({
          centreId: 1,
          slotId,
          paddyVariety: "Common Paddy — Grade A",
          paddyGrade: "Grade A",
          expectedQuantityQuintals: 18,
        }),
      });
      const bookData = await bookRes.json();
      activeBookingId = bookData.booking.id;
    }

    const res = await fetch(`${baseUrl}/officers/procurement/${activeBookingId}/qc-inspection`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${qcOfficerToken}`,
      },
      body: JSON.stringify({
        qualityGrade: "Grade A Fine (FAQ)",
        qcResult: "ACCEPTED",
        weighedQuantityQuintals: 18.5,
        moisturePercent: 13.8,
        foreignMatterPercent: 0.8,
        remarks: "Tested and certified under AP FCI standards.",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.qcResult).toBe("ACCEPTED");
    expect(data.qualityGrade).toBe("Grade A Fine (FAQ)");
  });

  it("8. Quality Control Inspector is forbidden from unauthorized actions (Logistics update)", async () => {
    const res = await fetch(`${baseUrl}/officers/transport/1/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${qcOfficerToken}`,
      },
      body: JSON.stringify({ status: "DELIVERED_AT_CENTRE" }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("FORBIDDEN");
  });

  it("9. Head Officer deactivates staff member", async () => {
    const res = await fetch(`${baseUrl}/officers/staff/${registeredStaffId}/disable`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.staff.status).toBe("DISABLED");
  });

  it("10. Deactivated staff member login is rejected with 403 ACCOUNT_DISABLED", async () => {
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: generatedOfficerCode, password: temporaryPassword }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("ACCOUNT_DISABLED");
  });

  it("11. Head Officer re-enables staff member", async () => {
    const res = await fetch(`${baseUrl}/officers/staff/${registeredStaffId}/enable`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.staff.status).toBe("ACTIVE");
  });

  it("12. Re-enabled staff member logs in successfully", async () => {
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: generatedOfficerCode, password: temporaryPassword }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
  });

  it("13. Head Officer inspects system audit trail for all staff actions", async () => {
    const res = await fetch(`${baseUrl}/officers/staff/audit-logs`, {
      headers: { Authorization: `Bearer ${headOfficerToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.auditLogs)).toBe(true);
    expect(data.auditLogs.length).toBeGreaterThanOrEqual(4);
    const actions = data.auditLogs.map((l: any) => l.action);
    expect(actions).toContain("STAFF_REQUEST_CREATED");
    expect(actions).toContain("STAFF_APPROVED");
    expect(actions).toContain("STAFF_DISABLED");
    expect(actions).toContain("STAFF_ENABLED");
  });
});
