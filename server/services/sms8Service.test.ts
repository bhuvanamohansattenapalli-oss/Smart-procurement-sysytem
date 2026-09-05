import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import {
  SMS8_SEND_URL,
  deliverSms8Otp,
  formatE164Phone,
  formatSms8OtpMessage,
  maskPhone,
  SmsDeliveryError,
} from "./sms8Service";
import {
  deliverOtp,
  getSmsProviderHealth,
  isOtpDemoMode,
  resolveSmsProvider,
} from "./otpService";
import { createProcurementApi } from "../routes/procurementApi";
import { ensurePrototypeSeed } from "./seedService";
import { issueOtpVerificationToken, verifyOtpVerificationToken } from "./tokenService";

describe("SMS8 OTP Provider Service & Integration Tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("Utility & Normalization Functions", () => {
    it("masks phone numbers safely without exposing full digits", () => {
      expect(maskPhone("9876543210")).toBe("98******10");
      expect(maskPhone("+919876543210")).toBe("91******10");
      expect(maskPhone("123")).toBe("****");
    });

    it("formats Indian phone numbers to standard E.164 representation (+91XXXXXXXXXX)", () => {
      expect(formatE164Phone("9876543210")).toBe("+919876543210");
      expect(formatE164Phone("09876543210")).toBe("+919876543210");
      expect(formatE164Phone("919876543210")).toBe("+919876543210");
      expect(formatE164Phone("+91 98765 43210")).toBe("+919876543210");
    });

    it("formats standard OTP message", () => {
      const msg = formatSms8OtpMessage("543210");
      expect(msg).toBe("Your ProcureFlow OTP is 543210. Do not share it with anyone.");
    });
  });

  describe("1. SMS_PROVIDER=demo -> existing demo behavior works", async () => {
    it("activates demo mode when SMS_PROVIDER=demo", async () => {
      vi.stubEnv("SMS_PROVIDER", "demo");
      expect(isOtpDemoMode()).toBe(true);
      expect(resolveSmsProvider().name).toBe("demo");

      const delivery = await deliverOtp("9876543210", "123456");
      expect(delivery.channel).toBe("development");
      expect(delivery.provider).toBe("DEMO_MODE");
      expect(delivery.developmentOtp).toBe("123456");
    });

    it("activates demo mode when OTP_DEMO_MODE=true even if SMS_PROVIDER is set to sms8", async () => {
      vi.stubEnv("OTP_DEMO_MODE", "true");
      vi.stubEnv("SMS_PROVIDER", "sms8");
      vi.stubEnv("SMS8_API_KEY", "mock-sms8-key");

      expect(isOtpDemoMode()).toBe(true);
      const delivery = await deliverOtp("9876543210", "654321");
      expect(delivery.channel).toBe("development");
      expect(delivery.provider).toBe("DEMO_MODE");
      expect(delivery.developmentOtp).toBe("654321");
    });
  });

  describe("2. SMS_PROVIDER=msg91 -> existing MSG91 behavior remains unchanged", () => {
    it("routes to MSG91 when SMS_PROVIDER=msg91 and fails in production if MSG91_AUTH_KEY is absent", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("SMS_PROVIDER", "msg91");
      vi.stubEnv("OTP_DEMO_MODE", "false");
      vi.stubEnv("MSG91_AUTH_KEY", "");
      vi.stubEnv("SMS_API_KEY", "");

      expect(isOtpDemoMode()).toBe(false);
      expect(resolveSmsProvider().name).toBe("msg91");
      await expect(deliverOtp("9876543210", "123456")).rejects.toThrow("MSG91_AUTH_KEY");
    });

    it("sends via MSG91 when MSG91_AUTH_KEY is present", async () => {
      vi.stubEnv("SMS_PROVIDER", "msg91");
      vi.stubEnv("MSG91_AUTH_KEY", "mock-msg91-key");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: "success", message: "OTP sent" }),
      });
      globalThis.fetch = mockFetch;

      const delivery = await deliverOtp("9876543210", "123456");
      expect(delivery.provider).toBe("MSG91");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("control.msg91.com");
    });
  });

  describe("3. SMS_PROVIDER=sms8 -> request is constructed correctly", () => {
    it("sends application/x-www-form-urlencoded POST with key, number, message, prioritize=1, and optional devices", async () => {
      vi.stubEnv("SMS_PROVIDER", "sms8");
      vi.stubEnv("SMS8_API_KEY", "test-secret-sms8-key");
      vi.stubEnv("SMS8_DEVICE_ID", "device-sim-100");

      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, data: { messages: [{ id: "msg_9988" }] } }),
        };
      });

      const delivery = await deliverOtp("9876543210", "789012");
      expect(delivery.channel).toBe("sms");
      expect(delivery.provider).toBe("SMS8");

      expect(capturedUrl).toBe(SMS8_SEND_URL);
      expect(capturedInit?.method).toBe("POST");
      expect(capturedInit?.headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });

      const parsedParams = new URLSearchParams(capturedInit?.body as string);
      expect(parsedParams.get("key")).toBe("test-secret-sms8-key");
      expect(parsedParams.get("number")).toBe("+919876543210");
      expect(parsedParams.get("message")).toBe("Your ProcureFlow OTP is 789012. Do not share it with anyone.");
      expect(parsedParams.get("prioritize")).toBe("1");
      expect(parsedParams.get("devices")).toBe("device-sim-100");
    });

    it("omits devices param when SMS8_DEVICE_ID is not configured", async () => {
      vi.stubEnv("SMS8_API_KEY", "test-secret-sms8-key");
      delete process.env.SMS8_DEVICE_ID;

      let capturedBody = "";
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, data: { messages: [] } }),
        };
      });

      await deliverSms8Otp("9876543210", "112233");
      const params = new URLSearchParams(capturedBody);
      expect(params.has("devices")).toBe(false);
    });
  });

  describe("4. SMS8 success response", () => {
    it("returns channel: sms, provider: SMS8 and extracts messageId", async () => {
      vi.stubEnv("SMS8_API_KEY", "valid-key");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: {
            messages: [{ id: "sms8_msg_44321", number: "+919876543210" }],
          },
        }),
      });

      const res = await deliverSms8Otp("9876543210", "445566");
      expect(res).toEqual({
        channel: "sms",
        provider: "SMS8",
        messageId: "sms8_msg_44321",
      });
    });
  });

  describe("5. SMS8 401 response (Invalid API Key)", () => {
    it("handles HTTP 401 and returns safe user message without leaking secrets", async () => {
      vi.stubEnv("SMS8_API_KEY", "bad-key");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          success: false,
          error: { code: 401, message: "Invalid API key provided" },
        }),
      });

      await expect(deliverSms8Otp("9876543210", "111111")).rejects.toThrow(
        "Unable to send OTP right now. Please try again later."
      );
    });
  });

  describe("6. SMS8 402/out-of-credits response", () => {
    it("handles HTTP 402 or balance error and returns safe user message", async () => {
      vi.stubEnv("SMS8_API_KEY", "valid-key");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => JSON.stringify({
          success: false,
          error: { code: 402, message: "Insufficient account balance or credits" },
        }),
      });

      await expect(deliverSms8Otp("9876543210", "222222")).rejects.toThrow(
        "Unable to send OTP right now. Please try again later."
      );
    });
  });

  describe("7. SMS8 429 response (Rate Limit)", () => {
    it("handles HTTP 429 rate limiting gracefully", async () => {
      vi.stubEnv("SMS8_API_KEY", "valid-key");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({
          success: false,
          error: { code: 429, message: "Too many requests per minute" },
        }),
      });

      await expect(deliverSms8Otp("9876543210", "333333")).rejects.toThrow(
        "Too many SMS requests sent. Please try again later."
      );
    });
  });

  describe("8. SMS8 timeout & network failure", () => {
    it("handles request abort/timeout cleanly", async () => {
      vi.stubEnv("SMS8_API_KEY", "valid-key");

      globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

      await expect(deliverSms8Otp("9876543210", "444444")).rejects.toThrow(
        "SMS delivery timed out. Please try again later."
      );
    });

    it("handles network connection error cleanly", async () => {
      vi.stubEnv("SMS8_API_KEY", "valid-key");

      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED connect to app.sms8.io"));

      await expect(deliverSms8Otp("9876543210", "555555")).rejects.toThrow(
        "Unable to send OTP right now. Please try again later."
      );
    });
  });

  describe("9. SMS8 missing API key", () => {
    it("throws clear configuration error when SMS8_API_KEY is missing", async () => {
      delete process.env.SMS8_API_KEY;

      await expect(deliverSms8Otp("9876543210", "666666")).rejects.toThrow(
        "SMS8 delivery service is not configured. Please set SMS8_API_KEY in environment variables."
      );
    });
  });

  describe("10. OTP value & API key are never exposed in production logs", () => {
    it("ensures console output never logs the raw OTP or SMS8 API key", async () => {
      vi.stubEnv("SMS8_API_KEY", "super-secret-production-sms8-key-999");
      const otpCode = "948271";

      const infoSpy = vi.spyOn(console, "info");
      const errorSpy = vi.spyOn(console, "error");
      const logSpy = vi.spyOn(console, "log");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { messages: [{ id: 101 }] } }),
      });

      await deliverSms8Otp("9876543210", otpCode);

      const allLogged = [
        ...infoSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
        ...logSpy.mock.calls.flat(),
      ].join(" ");

      expect(allLogged).not.toContain(otpCode);
      expect(allLogged).not.toContain("super-secret-production-sms8-key-999");
    });
  });

  describe("11. SMS8 API key is never exposed to frontend/API responses", async () => {
    it("ensures /health and /health/sms report provider info without exposing secrets", async () => {
      vi.stubEnv("SMS_PROVIDER", "sms8");
      vi.stubEnv("SMS8_API_KEY", "secret-key-that-must-never-be-exposed-12345");
      vi.stubEnv("SMS8_DEVICE_ID", "device-sim-1");

      const app = express();
      app.use(express.json());
      app.use("/api", createProcurementApi());

      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
        const healthData = await healthRes.json();
        const serialized = JSON.stringify(healthData);

        expect(serialized).not.toContain("secret-key-that-must-never-be-exposed-12345");
        expect(healthData.smsProvider).toBe("SMS8");
        expect(healthData.smsConfigured).toBe(true);
        expect(healthData.sms.sms8Configured).toBe(true);

        const smsHealthRes = await fetch(`http://127.0.0.1:${port}/api/health/sms`);
        const smsHealthData = await smsHealthRes.json();
        const smsSerialized = JSON.stringify(smsHealthData);

        expect(smsSerialized).not.toContain("secret-key-that-must-never-be-exposed-12345");
        expect(smsHealthData.smsProvider).toBe("SMS8");
        expect(smsHealthData.configured).toBe(true);
        expect(smsHealthData.sms8Configured).toBe(true);
        expect(smsHealthData.deviceIdConfigured).toBe(true);
      } finally {
        server.close();
      }
    });
  });

  describe("12. Registration OTP still verifies normally when SMS8 is provider", async () => {
    it("completes OTP challenge lifecycle with SMS8 mock", async () => {
      await ensurePrototypeSeed();
      vi.stubEnv("SMS_PROVIDER", "sms8");
      vi.stubEnv("SMS8_API_KEY", "test-sms8-key");

      let sentCode = "";
      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes("sms8.io")) {
          const bodyParams = new URLSearchParams(String(init?.body));
          const msg = bodyParams.get("message") || "";
          const match = msg.match(/\b\d{6}\b/);
          if (match) sentCode = match[0];

          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true, data: { messages: [{ id: "m-1" }] } }),
          };
        }
        return originalFetch(url, init);
      });

      const app = express();
      app.use(express.json());
      app.use("/api", createProcurementApi());
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const testRegPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;

        // Step 1: Send OTP
        const sendRes = await fetch(`http://127.0.0.1:${port}/api/auth/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: testRegPhone, purpose: "REGISTRATION" }),
        });
        expect(sendRes.status).toBe(200);
        const sendData = await sendRes.json();
        expect(sendData.challengeId).toBeDefined();
        expect(sentCode).toMatch(/^\d{6}$/);

        // Step 2: Verify OTP
        const verifyRes = await fetch(`http://127.0.0.1:${port}/api/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: sendData.challengeId, otp: sentCode }),
        });
        expect(verifyRes.status).toBe(200);
        const verifyData = await verifyRes.json();
        expect(verifyData.verificationToken).toBeDefined();
        expect(verifyData.purpose).toBe("REGISTRATION");

        // Step 3: Complete Farmer Registration
        const regRes = await fetch(`http://127.0.0.1:${port}/api/registration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "SMS8 Farmer Verification",
            phone: testRegPhone,
            aadhaarMasked: "XXXX XXXX 8899",
            village: "Kollipara",
            district: "Guntur",
            primaryCrop: "Paddy",
            password: "SecureSMS8Farmer@2026",
            verificationToken: verifyData.verificationToken,
            declarationAccepted: true,
          }),
        });
        expect(regRes.status).toBe(201);
        const regData = await regRes.json();
        expect(regData.farmer.phone).toBe(testRegPhone);
      } finally {
        server.close();
      }
    });
  });

  describe("13. Password-reset OTP still verifies normally when SMS8 is provider", async () => {
    it("completes forgot password lifecycle using SMS8 mock", async () => {
      await ensurePrototypeSeed();
      vi.stubEnv("SMS_PROVIDER", "sms8");
      vi.stubEnv("SMS8_API_KEY", "test-sms8-key");

      let resetOtp = "";
      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes("sms8.io")) {
          const bodyParams = new URLSearchParams(String(init?.body));
          const match = (bodyParams.get("message") || "").match(/\b\d{6}\b/);
          if (match) resetOtp = match[0];
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true, data: { messages: [{ id: "m-reset" }] } }),
          };
        }
        return originalFetch(url, init);
      });

      const app = express();
      app.use(express.json());
      app.use("/api", createProcurementApi());
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        // Use existing seeded farmer Ramesh Kumar
        const farmerPhone = "9876543210";

        // Step 1: Send Reset OTP
        const sendRes = await fetch(`http://127.0.0.1:${port}/api/auth/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: farmerPhone, purpose: "PASSWORD_RESET" }),
        });
        expect(sendRes.status).toBe(200);
        const sendData = await sendRes.json();
        expect(resetOtp).toMatch(/^\d{6}$/);

        // Step 2: Verify Reset OTP
        const verifyRes = await fetch(`http://127.0.0.1:${port}/api/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: sendData.challengeId, otp: resetOtp }),
        });
        expect(verifyRes.status).toBe(200);
        const verifyData = await verifyRes.json();
        expect(verifyData.purpose).toBe("PASSWORD_RESET");

        // Step 3: Set New Password
        const resetRes = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationToken: verifyData.verificationToken,
            newPassword: "UpdatedPassword@2026",
            confirmPassword: "UpdatedPassword@2026",
          }),
        });
        expect(resetRes.status).toBe(200);

        // Step 4: Login with New Password
        const loginRes = await fetch(`http://127.0.0.1:${port}/api/farmers/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: farmerPhone, password: "UpdatedPassword@2026" }),
        });
        expect(loginRes.status).toBe(200);
      } finally {
        server.close();
      }
    });
  });

  describe("14. Existing signed verification-token behavior remains intact", async () => {
    it("issues and validates signed tokens with tamper resistance", async () => {
      const token = await issueOtpVerificationToken(42, "9876543210", "REGISTRATION");
      expect(typeof token).toBe("string");

      const payload = await verifyOtpVerificationToken(token);
      expect(payload.challengeId).toBe(42);
      expect(payload.phone).toBe("9876543210");
      expect(payload.purpose).toBe("REGISTRATION");

      // Tampered token fails
      const tampered = token.slice(0, -4) + "XXXX";
      await expect(verifyOtpVerificationToken(tampered)).rejects.toThrow();
    });
  });
});
