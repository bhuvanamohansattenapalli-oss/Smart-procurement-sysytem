import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { getDb } from "./db";
import { farmers, registrations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Direct Farmer Authentication & Password Verification Integration Tests (No OTP)", () => {
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

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  describe("1. Direct Farmer Registration (No OTP)", () => {
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testPassword = "Farmer@SecurePassword2026";
    let registeredFarmerId: number;
    let registrationRecordId: number;

    it("rejects registration with invalid or short mobile number", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Farmer",
          phone: "12345",
          password: testPassword,
          village: "Kisan Nagar",
          district: "Warangal",
          primaryCrop: "Paddy",
          aadhaarMasked: "XXXX XXXX 1234",
          declarationAccepted: true,
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("rejects registration with short password (< 8 chars)", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Farmer",
          phone: testPhone,
          password: "short",
          village: "Kisan Nagar",
          district: "Warangal",
          primaryCrop: "Paddy",
          aadhaarMasked: "XXXX XXXX 1234",
          declarationAccepted: true,
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("successfully creates farmer account directly without OTP", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Direct Farmer Ramu",
          phone: testPhone,
          password: testPassword,
          village: "Kisan Nagar",
          district: "Warangal",
          primaryCrop: "Paddy",
          aadhaarMasked: "XXXX XXXX 5678",
          declarationAccepted: true,
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.farmer).toBeDefined();
      expect(data.farmer.name).toBe("Direct Farmer Ramu");
      expect(data.farmer.phone).toBe(testPhone);
      expect(data.farmer.status).toBe("PENDING");
      expect(data.status).toBe("PENDING");
      expect(data.registrationId).toBeDefined();

      registeredFarmerId = data.farmer.id;
      registrationRecordId = data.registrationId;

      // Verify in DB: password must be securely hashed and never plaintext
      const db = await getDb();
      if (db) {
        const [savedFarmer] = await db.select().from(farmers).where(eq(farmers.id, registeredFarmerId)).limit(1);
        expect(savedFarmer).toBeDefined();
        expect(savedFarmer.passwordHash).not.toBe(testPassword);
        expect(savedFarmer.passwordHash).toContain(":");
      }
    });

    it("prevents duplicate registration with the same mobile number", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate Attempt Farmer",
          phone: testPhone,
          password: "AnotherPassword123",
          village: "Kisan Nagar",
          district: "Warangal",
          primaryCrop: "Paddy",
          aadhaarMasked: "XXXX XXXX 5678",
          declarationAccepted: true,
        }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("PHONE_EXISTS");
    });

    it("rejects farmer login prior to officer approval with 403 REGISTRATION_NOT_APPROVED", async () => {
      const res = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          password: testPassword,
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("REGISTRATION_NOT_APPROVED");
      expect(data.status).toBe("PENDING");
    });
  });

  describe("2. Farmer Login & Credential Verification", () => {
    it("rejects login for non-existent mobile number with 401 FARMER_NOT_FOUND", async () => {
      const res = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9111111111",
          password: "AnyPassword123",
        }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("FARMER_NOT_FOUND");
    });

    it("rejects login with incorrect password for existing farmer with 401 INVALID_CREDENTIALS", async () => {
      // Seed farmer Ramesh Kumar phone is 9876543210
      const res = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9876543210",
          password: "WrongPassword123",
        }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("INVALID_CREDENTIALS");
    });

    it("authenticates approved farmer with valid mobile + password and issues JWT", async () => {
      // Ramesh Kumar seeded password is Farmer@2026
      const res = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9876543210",
          password: "Farmer@2026",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBeDefined();
      expect(data.tokenType).toBe("Bearer");
      expect(data.farmer).toBeDefined();
      expect(data.farmer.name).toBe("Ramesh Kumar");
      expect(data.farmer.phone).toBe("9876543210");
    });
  });

  describe("3. Direct Password Recovery (No OTP)", () => {
    const resetTestPhone = "9876543210";
    const newResetPassword = "NewFarmerPassword@2026";

    it("rejects password reset for unknown mobile number with 404 FARMER_NOT_FOUND", async () => {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9000000000",
          newPassword: newResetPassword,
        }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("FARMER_NOT_FOUND");
    });

    it("rejects password reset with password shorter than 8 characters", async () => {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: resetTestPhone,
          newPassword: "short",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("successfully resets password directly and enables login with new password", async () => {
      const resetRes = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: resetTestPhone,
          newPassword: newResetPassword,
        }),
      });
      expect(resetRes.status).toBe(200);
      const resetData = await resetRes.json();
      expect(resetData.message).toContain("Password reset successfully");

      // Verify farmer can now log in with the new password
      const loginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: resetTestPhone,
          password: newResetPassword,
        }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.accessToken).toBeDefined();

      // Restore password back to Farmer@2026 for other tests
      await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: resetTestPhone,
          newPassword: "Farmer@2026",
        }),
      });
    });
  });

  describe("4. Officer Lifecycle: Review, Approval & Protected Endpoints", () => {
    let officerToken: string;
    const approvalTestPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;
    const approvalTestPassword = "TestPassword@2026";
    let newRegId: number;

    beforeAll(async () => {
      // Register a new farmer to be approved by officer
      const regRes = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Pending Farmer For Approval",
          phone: approvalTestPhone,
          password: approvalTestPassword,
          village: "Pedda Shapur",
          district: "Rangareddy",
          primaryCrop: "Cotton",
          aadhaarMasked: "XXXX XXXX 3344",
          declarationAccepted: true,
        }),
      });
      const regData = await regRes.json();
      newRegId = regData.registrationId;
    });

    it("authenticates officer using Officer Code + Password and returns JWT token", async () => {
      const res = await fetch(`${baseUrl}/officers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: "OFF-NZM-104",
          password: "Officer@2026",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBeDefined();
      expect(data.officer).toBeDefined();
      expect(data.officer.role).toBe("HEAD_OFFICER");
      officerToken = data.accessToken;
    });

    it("allows officer to view pending registrations using Bearer token", async () => {
      const res = await fetch(`${baseUrl}/officers/registrations/pending`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.registrations)).toBe(true);
      const found = data.registrations.find((r: any) => r.id === newRegId);
      expect(found).toBeDefined();
      expect(found.farmer.phone).toBe(approvalTestPhone);
    });

    it("approves pending farmer registration and allows immediate login", async () => {
      const approveRes = await fetch(`${baseUrl}/officers/registrations/${newRegId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      expect(approveRes.status).toBe(200);
      const approveData = await approveRes.json();
      expect(approveData.success).toBe(true);

      // Farmer can now log in
      const loginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: approvalTestPhone,
          password: approvalTestPassword,
        }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.accessToken).toBeDefined();
      expect(loginData.farmer.status).toBe("APPROVED");

      // Verify farmer can access protected farmer routes with token
      const bookingsRes = await fetch(`${baseUrl}/farmers/${loginData.farmer.id}/bookings`, {
        headers: { Authorization: `Bearer ${loginData.accessToken}` },
      });
      expect([200, 304]).toContain(bookingsRes.status);
    });

    it("blocks access to protected officer routes when using farmer token with 403 FORBIDDEN", async () => {
      // Login with the newly approved farmer
      const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: approvalTestPhone,
          password: approvalTestPassword,
        }),
      });
      expect(farmerLoginRes.status).toBe(200);
      const { accessToken: farmerToken } = await farmerLoginRes.json();
      expect(farmerToken).toBeDefined();

      const forbiddenRes = await fetch(`${baseUrl}/officers/registrations/pending`, {
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      expect(forbiddenRes.status).toBe(403);
    });
  });
});
