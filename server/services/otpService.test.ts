import { afterEach, describe, expect, it, vi } from "vitest";
import { OTP_LENGTH, createOtpCode, deliverOtp, hashOtp, verifyOtp } from "./otpService";

describe("otpService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses development delivery when no usable SMS provider is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMS_PROVIDER", "");
    vi.stubEnv("SMS_API_KEY", "");
    vi.stubEnv("SMS_SENDER_ID", "");
    const delivery = await deliverOtp("9876543210", "123456");
    expect(delivery).toEqual({ channel: "development", provider: "DEVELOPMENT", developmentOtp: "123456" });
  });

  it("allows explicit development mode even when provider metadata is present", async () => {
    vi.stubEnv("OTP_MODE", "DEVELOPMENT");
    vi.stubEnv("SMS_PROVIDER", "future-provider");
    vi.stubEnv("SMS_API_KEY", "configured-only-for-test");
    vi.stubEnv("SMS_SENDER_ID", "PROCUREFLOW");
    const delivery = await deliverOtp("9876543210", "654321");
    expect(delivery.channel).toBe("development");
    expect(delivery.developmentOtp).toBe("654321");
  });

  it("keeps a completely configured provider behind the adapter boundary", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMS_PROVIDER", "future-provider");
    vi.stubEnv("SMS_API_KEY", "configured-only-for-test");
    vi.stubEnv("SMS_SENDER_ID", "PROCUREFLOW");
    await expect(deliverOtp("9876543210", "654321")).rejects.toThrow("no server-side adapter has been installed");
  });

  it("creates six-digit one-time codes and verifies only their hash", () => {
    const code = createOtpCode();
    expect(code).toMatch(new RegExp(`^\\d{${OTP_LENGTH}}$`));
    const hash = hashOtp(code);
    expect(hash).not.toContain(code);
    expect(verifyOtp(code, hash)).toBe(true);
    expect(verifyOtp("000000", hash)).toBe(code === "000000");
  });
});
