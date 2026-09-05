import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";
import { issueOtpVerificationToken } from "./services/tokenService";

describe("Farmer SMS OTP Authentication & Bypass Prevention Integration Tests", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    await ensurePrototypeSeed();
    process.env.ENFORCE_OTP_VERIFICATION = "true";
    process.env.OTP_MODE = "DEVELOPMENT";

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
    delete process.env.ENFORCE_OTP_VERIFICATION;
    delete process.env.OTP_MODE;
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  describe("1. Registration SMS OTP Flow", () => {
    const testPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    let challengeId: number;
    let devOtp: string;
    let verificationToken: string;

    it("rejects duplicate mobile registration OTP request when farmer already exists", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210", purpose: "REGISTRATION" }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("PHONE_ALREADY_EXISTS");
    });

    it("successfully sends registration OTP for new mobile number", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, purpose: "REGISTRATION" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.challengeId).toBeDefined();
      expect(data.resendAvailableInSeconds).toBe(30);
      expect(data.expiresInSeconds).toBe(300);
      expect(data.developmentOtp).toBeDefined();

      challengeId = data.challengeId;
      devOtp = data.developmentOtp;
    });

    it("enforces resend cooldown timer (30s)", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBe("RESEND_COOLDOWN");
      expect(data.resendAvailableInSeconds).toBeGreaterThan(0);
    });

    it("enforces wrong OTP attempt limits and lockout after 5 attempts", async () => {
      // Send a separate challenge to test lockout
      const sendRes = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `96${Math.floor(10000000 + Math.random() * 90000000)}`, purpose: "REGISTRATION" }),
      });
      const sendData = await sendRes.json();
      const lockChallengeId = sendData.challengeId;

      // 5 incorrect attempts
      for (let i = 1; i <= 5; i++) {
        const verifyRes = await fetch(`${baseUrl}/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: lockChallengeId, otp: "000000" }),
        });
        if (i < 5) {
          expect(verifyRes.status).toBe(400);
          const data = await verifyRes.json();
          expect(data.attemptsRemaining).toBe(5 - i);
        } else {
          expect(verifyRes.status).toBe(400);
        }
      }

      // 6th attempt must be locked
      const lockedRes = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: lockChallengeId, otp: "000000" }),
      });
      expect(lockedRes.status).toBe(403);
      const lockedData = await lockedRes.json();
      expect(lockedData.error).toBe("OTP_LOCKED");
    });

    it("verifies the correct OTP and returns signed verificationToken", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp: devOtp }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.verificationToken).toBeDefined();
      expect(data.purpose).toBe("REGISTRATION");
      verificationToken = data.verificationToken;
    });

    it("completes registration with verificationToken", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Lakshman OTP Farmer",
          phone: testPhone,
          aadhaarMasked: "XXXX XXXX 3344",
          village: "Muppalla",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "SecureFarmer@2026",
          verificationToken,
          declarationAccepted: true,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.farmer).toBeDefined();
      expect(data.farmer.phone).toBe(testPhone);
      expect(data.farmer.status).toBe("PENDING");
    });
  });

  describe("2. Forgot Password SMS OTP Flow", () => {
    const existingPhone = "9876543210"; // Default seed farmer Ramesh Kumar
    let forgotChallengeId: number;
    let forgotDevOtp: string;
    let forgotVerificationToken: string;

    it("rejects forgot password OTP request for unknown mobile numbers", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9999988888", purpose: "PASSWORD_RESET" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("FARMER_NOT_FOUND");
    });

    it("sends forgot password OTP for registered farmer", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: existingPhone, purpose: "PASSWORD_RESET" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.challengeId).toBeDefined();
      expect(data.developmentOtp).toBeDefined();
      forgotChallengeId = data.challengeId;
      forgotDevOtp = data.developmentOtp;
    });

    it("verifies forgot password OTP and returns PASSWORD_RESET verification token", async () => {
      const res = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: forgotChallengeId, otp: forgotDevOtp }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.verificationToken).toBeDefined();
      expect(data.purpose).toBe("PASSWORD_RESET");
      forgotVerificationToken = data.verificationToken;
    });

    it("updates password in-place without creating duplicate farmer accounts", async () => {
      const initialFarmersRes = await fetch(`${baseUrl}/crop-prices`); // sanity ping
      expect(initialFarmersRes.status).toBe(200);

      const resetRes = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: forgotVerificationToken,
          newPassword: "BrandNewPassword@2026",
        }),
      });

      expect(resetRes.status).toBe(200);
      const resetData = await resetRes.json();
      expect(resetData.message).toContain("Password reset successfully");

      // 1. Old password should now fail
      const oldLoginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: existingPhone, password: "Farmer@2026" }),
      });
      expect(oldLoginRes.status).toBe(401);

      // 2. New password should succeed
      const newLoginRes = await fetch(`${baseUrl}/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: existingPhone, password: "BrandNewPassword@2026" }),
      });
      expect(newLoginRes.status).toBe(200);
      const newLoginData = await newLoginRes.json();
      expect(newLoginData.farmer.id).toBe(1);
      expect(newLoginData.farmer.phone).toBe(existingPhone);

      // Restore password back to original for other test suites
      const restoreChallengeRes = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: existingPhone, purpose: "PASSWORD_RESET" }),
      });
      const rData = await restoreChallengeRes.json();
      const rVerifyRes = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: rData.challengeId, otp: rData.developmentOtp }),
      });
      const rVerifyData = await rVerifyRes.json();
      await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: rVerifyData.verificationToken,
          newPassword: "Farmer@2026",
        }),
      });
    });
  });

  describe("3. OTP Bypass Prevention Checks", () => {
    it("rejects registration when verificationToken is completely omitted", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bypass Attacker",
          phone: "9123456789",
          aadhaarMasked: "XXXX XXXX 9999",
          village: "Test Village",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "AttackerPass@123",
          declarationAccepted: true,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("OTP_VERIFICATION_REQUIRED");
    });

    it("rejects registration when verificationToken is forged or malformed", async () => {
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Forged Token Attacker",
          phone: "9123456789",
          aadhaarMasked: "XXXX XXXX 9999",
          village: "Test Village",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "AttackerPass@123",
          verificationToken: "eyJhbGciOiJIUzI1NiJ9.invalid.signature",
          declarationAccepted: true,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("INVALID_VERIFICATION_TOKEN");
    });

    it("rejects registration when token was issued for a different phone number", async () => {
      // Issue a valid token for phone 9111111111
      const token = await issueOtpVerificationToken(999, "9111111111", "REGISTRATION");

      // Try to use it with phone 9222222222
      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Phone Mismatch Attacker",
          phone: "9222222222",
          aadhaarMasked: "XXXX XXXX 9999",
          village: "Test Village",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "AttackerPass@123",
          verificationToken: token,
          declarationAccepted: true,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("INVALID_VERIFICATION_TOKEN");
    });

    it("rejects registration when token purpose is PASSWORD_RESET", async () => {
      const token = await issueOtpVerificationToken(999, "9123456789", "PASSWORD_RESET");

      const res = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Wrong Purpose Attacker",
          phone: "9123456789",
          aadhaarMasked: "XXXX XXXX 9999",
          village: "Test Village",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "AttackerPass@123",
          verificationToken: token,
          declarationAccepted: true,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("INVALID_VERIFICATION_TOKEN");
    });

    it("prevents token replay attacks (token cannot be reused after registration)", async () => {
      const replayPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 1. Legitimate OTP send & verify
      const sendRes = await fetch(`${baseUrl}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: replayPhone, purpose: "REGISTRATION" }),
      });
      const sendData = await sendRes.json();
      const verifyRes = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: sendData.challengeId, otp: sendData.developmentOtp }),
      });
      const verifyData = await verifyRes.json();
      const token = verifyData.verificationToken;

      // 2. First registration succeeds
      const firstRes = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "First Registration",
          phone: replayPhone,
          aadhaarMasked: "XXXX XXXX 1111",
          village: "Village A",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "ValidPass@2026",
          verificationToken: token,
          declarationAccepted: true,
        }),
      });
      expect(firstRes.status).toBe(201);

      // 3. Second registration with the same token must be rejected
      const replayRes = await fetch(`${baseUrl}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Replay Attempt",
          phone: replayPhone,
          aadhaarMasked: "XXXX XXXX 1111",
          village: "Village A",
          district: "Guntur",
          primaryCrop: "Paddy",
          password: "ValidPass@2026",
          verificationToken: token,
          declarationAccepted: true,
        }),
      });
      expect(replayRes.status).toBe(403);
      const replayData = await replayRes.json();
      expect(replayData.error).toBe("CHALLENGE_NOT_VERIFIED");
    });

    it("rejects forgot-password when verificationToken is omitted or has REGISTRATION purpose", async () => {
      // Omitted
      const res1 = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "SomeNewPassword@123" }),
      });
      expect(res1.status).toBe(400);

      // Wrong purpose (REGISTRATION token instead of PASSWORD_RESET)
      const regToken = await issueOtpVerificationToken(999, "9876543210", "REGISTRATION");
      const res2 = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: regToken,
          newPassword: "SomeNewPassword@123",
        }),
      });
      expect(res2.status).toBe(401);
      const data2 = await res2.json();
      expect(data2.error).toBe("INVALID_VERIFICATION_TOKEN");
    });
  });
});
