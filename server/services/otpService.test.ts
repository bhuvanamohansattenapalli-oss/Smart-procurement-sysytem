import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OTP_LENGTH,
  createOtpCode,
  deliverOtp,
  getSmsProviderHealth,
  hashOtp,
  isOtpDemoMode,
  resolveSmsProvider,
  verifyOtp,
} from "./otpService";

describe("otpService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails in production when MSG91_AUTH_KEY is not configured and OTP_DEMO_MODE is false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_DEMO_MODE", "false");
    vi.stubEnv("MSG91_AUTH_KEY", "");
    vi.stubEnv("SMS_API_KEY", "");
    expect(isOtpDemoMode()).toBe(false);
    await expect(deliverOtp("9876543210", "123456")).rejects.toThrow("MSG91_AUTH_KEY");
  });

  it("activates demo mode in production when OTP_DEMO_MODE=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_DEMO_MODE", "true");
    vi.stubEnv("MSG91_AUTH_KEY", "");
    expect(isOtpDemoMode()).toBe(true);
    const delivery = await deliverOtp("9876543210", "482731");
    expect(delivery).toEqual({ channel: "development", provider: "DEMO_MODE", developmentOtp: "482731" });
  });

  it("recognizes 1, yes, true for OTP_DEMO_MODE", () => {
    vi.stubEnv("OTP_DEMO_MODE", "1");
    expect(isOtpDemoMode()).toBe(true);
    vi.stubEnv("OTP_DEMO_MODE", "yes");
    expect(isOtpDemoMode()).toBe(true);
    vi.stubEnv("OTP_DEMO_MODE", "false");
    expect(isOtpDemoMode()).toBe(false);
  });

  it("uses development test delivery when in development mode and MSG91 is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MSG91_AUTH_KEY", "");
    vi.stubEnv("SMS_API_KEY", "");
    const delivery = await deliverOtp("9876543210", "123456");
    expect(delivery).toEqual({ channel: "development", provider: "DEVELOPMENT", developmentOtp: "123456" });
  });

  it("allows explicit development mode even when provider metadata is present", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_MODE", "DEVELOPMENT");
    vi.stubEnv("SMS_PROVIDER", "future-provider");
    vi.stubEnv("SMS_API_KEY", "configured-only-for-test");
    vi.stubEnv("SMS_SENDER_ID", "PROCUREFLOW");
    const delivery = await deliverOtp("9876543210", "654321");
    expect(delivery.channel).toBe("development");
    expect(delivery.developmentOtp).toBe("654321");
  });

  it("creates six-digit one-time codes and verifies only their hash", () => {
    const code = createOtpCode();
    expect(code).toMatch(new RegExp(`^\\d{${OTP_LENGTH}}$`));
    const hash = hashOtp(code);
    expect(hash).not.toContain(code);
    expect(verifyOtp(code, hash)).toBe(true);
    expect(verifyOtp("000000", hash)).toBe(code === "000000");
  });

  it("resolves SMS providers correctly across configuration states", () => {
    vi.stubEnv("SMS_PROVIDER", "demo");
    expect(resolveSmsProvider().name).toBe("demo");

    vi.stubEnv("SMS_PROVIDER", "sms8");
    expect(resolveSmsProvider().name).toBe("sms8");

    vi.stubEnv("SMS_PROVIDER", "msg91");
    expect(resolveSmsProvider().name).toBe("msg91");

    vi.stubEnv("SMS_PROVIDER", "");
    expect(resolveSmsProvider().name).toBe("msg91");
  });

  it("reports safe SMS provider health without secrets", () => {
    vi.stubEnv("SMS_PROVIDER", "sms8");
    vi.stubEnv("SMS8_API_KEY", "super-secret-key-12345");
    vi.stubEnv("SMS8_DEVICE_ID", "sim-device-01");

    const health = getSmsProviderHealth();
    expect(health.provider).toBe("SMS8");
    expect(health.configured).toBe(true);
    expect(health.sms8Configured).toBe(true);
    expect(health.deviceIdConfigured).toBe(true);
    expect(JSON.stringify(health)).not.toContain("super-secret-key-12345");
  });
});
