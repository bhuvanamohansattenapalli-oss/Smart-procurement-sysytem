import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";

describe("Password Reset Workflows (Officer & Farmer)", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let headOfficerToken = "";
  let officerRequestId = "";
  let officerResetToken = "";
  const farmerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  beforeAll(async () => {
    await ensurePrototypeSeed().catch(() => {});

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

    // Login as Head Officer to obtain Bearer token for approval tests
    const res = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    headOfficerToken = data.accessToken;
    expect(headOfficerToken).toBeTruthy();

    // Register a test farmer for farmer forgot password testing
    const regRes = await fetch(`${baseUrl}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ramesh Naidu",
        phone: farmerPhone,
        password: "InitialPassword@2026",
        village: "Tenali",
        district: "Guntur",
        primaryCrop: "Paddy (Common)",
        aadhaarMasked: "XXXX XXXX 8921",
        declarationAccepted: true,
      }),
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    const farmerId = regData.farmer?.id;

    // Approve the farmer registration using Head Officer token so login can succeed
    if (regData.registrationId) {
      await fetch(`${baseUrl}/officers/registrations/${regData.registrationId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${headOfficerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  describe("Officer Forgot Password Workflow", () => {
    it("fails when officer code does not exist", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerCode: "NONEXISTENT_999", contact: "test@example.com" }),
      });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.error).toBe("OFFICER_NOT_FOUND");
    });

    it("fails when contact information does not match registered officer", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerCode: "QC-2026-4892", contact: "wrong.email@unknown.com" }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("CONTACT_MISMATCH");
    });

    it("successfully creates a password reset request when credentials match", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerCode: "QC-2026-4892", contact: "qc.madhavan@smartprocure.gov.in" }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requestId).toMatch(/^REQ-OFF-/);
      expect(data.message).toContain("Please contact your Head Officer for approval");
      officerRequestId = data.requestId;
    });

    it("rejects completion before Head Officer approval", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: "QC-2026-4892",
          requestId: officerRequestId,
          resetToken: "HO-RES-FAKE",
          newPassword: "NewStrongPassword@2026",
        }),
      });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe("PENDING_APPROVAL");
    });

    it("allows Head Officer to view pending requests", async () => {
      const res = await fetch(`${baseUrl}/officers/password-resets`, {
        headers: { Authorization: `Bearer ${headOfficerToken}` },
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data.requests)).toBe(true);
      const found = data.requests.find((r: any) => r.requestId === officerRequestId);
      expect(found).toBeTruthy();
      expect(found.status).toBe("PENDING_APPROVAL");
    });

    it("allows Head Officer to approve the request and issue a reset token", async () => {
      const res = await fetch(`${baseUrl}/officers/password-resets/${officerRequestId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${headOfficerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resetToken).toMatch(/^HO-RES-/);
      officerResetToken = data.resetToken;
    });

    it("rejects completion with weak password", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: "QC-2026-4892",
          requestId: officerRequestId,
          resetToken: officerResetToken,
          newPassword: "weak",
        }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
    });

    it("rejects completion with incorrect token", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: "QC-2026-4892",
          requestId: officerRequestId,
          resetToken: "HO-RES-WRONG1",
          newPassword: "ValidPassword@2026",
        }),
      });
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("INVALID_TOKEN");
    });

    it("successfully completes password reset with valid token and strong password", async () => {
      const res = await fetch(`${baseUrl}/officers/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: "QC-2026-4892",
          requestId: officerRequestId,
          resetToken: officerResetToken,
          newPassword: "UpdatedOfficerPass@2026",
        }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify that officer can log in with new password
      const loginRes = await fetch(`${baseUrl}/officers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerCode: "QC-2026-4892", password: "UpdatedOfficerPass@2026" }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.accessToken).toBeTruthy();
    });
  });

  describe("Farmer Forgot Password Workflow", () => {
    let farmerResetToken = "";

    it("fails verification when phone does not exist", async () => {
      const res = await fetch(`${baseUrl}/farmers/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9999999999", village: "Tenali" }),
      });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.error).toBe("FARMER_NOT_FOUND");
    });

    it("fails verification when village does not match farmer record", async () => {
      const res = await fetch(`${baseUrl}/farmers/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: farmerPhone, village: "WrongVillageName" }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("IDENTITY_VERIFICATION_FAILED");
    });

    it("verifies identity when mobile and village match", async () => {
      const res = await fetch(`${baseUrl}/farmers/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: farmerPhone, village: "Tenali" }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.verified).toBe(true);
      expect(data.resetToken).toMatch(/^FMR-/);
      farmerResetToken = data.resetToken;
    });

    it("resets farmer password and allows login with new password", async () => {
      const resetRes = await fetch(`${baseUrl}/farmers/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: farmerPhone,
          resetToken: farmerResetToken,
          newPassword: "NewFarmerPassword@2026",
        }),
      });
      const resetData = await resetRes.json();
      expect(resetRes.status).toBe(200);
      expect(resetData.success).toBe(true);

      // Verify login with new password
      const loginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: farmerPhone, password: "NewFarmerPassword@2026" }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.accessToken).toBeTruthy();
    });
  });
});
