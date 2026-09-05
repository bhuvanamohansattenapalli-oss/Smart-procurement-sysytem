import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwordService";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_REQUESTS = 3;

export function createOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(code: string): string {
  return hashPassword(code);
}

export function verifyOtp(code: string, otpHash: string): boolean {
  return verifyPassword(code, otpHash);
}

export type OtpDelivery = {
  channel: "sms" | "development";
  provider: string;
  developmentOtp?: string;
};

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return digits.slice(0, 2) + "******" + digits.slice(-2);
}

/**
 * Deliver OTP using MSG91 SMS service.
 * In production:
 * - Requires MSG91_AUTH_KEY. If missing, throws fatal error.
 * - Never returns or logs plaintext OTP.
 * In development/test:
 * - If MSG91_AUTH_KEY is missing, logs that MSG91 is not configured and provides test fallback.
 */
export async function deliverOtp(phone: string, code: string): Promise<OtpDelivery> {
  const isProduction = process.env.NODE_ENV === "production";
  const authKey = process.env.MSG91_AUTH_KEY?.trim() || process.env.SMS_API_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim() || process.env.SMS_SENDER_ID?.trim();
  const customProvider = process.env.SMS_PROVIDER?.trim();

  // Fallback allowed ONLY when NODE_ENV is explicitly development/test
  const isDevOrTest = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const isExplicitDevMode = isDevOrTest && process.env.OTP_MODE?.trim().toUpperCase() === "DEVELOPMENT";

  // Non-production fallback when explicitly in dev mode
  if (isExplicitDevMode) {
    console.info(`[OTP Development Mode] Explicit OTP_MODE=DEVELOPMENT in ${process.env.NODE_ENV}. Using development OTP fallback for ${maskPhone(phone)}.`);
    return { channel: "development", provider: "DEVELOPMENT", developmentOtp: code };
  }

  // Test suite compatibility: if custom uninstalled provider is explicitly set in tests
  if (customProvider && customProvider !== "MSG91" && customProvider.toUpperCase() !== "DEVELOPMENT") {
    throw new Error(`SMS provider '${customProvider}' credentials are present, but no server-side adapter has been installed.`);
  }

  if (!isDevOrTest) {
    // Production/Staging: MSG91_AUTH_KEY is strictly required. No fallback allowed under any circumstances.
    if (!authKey) {
      console.error("[OTP Delivery Error] Production SMS failure: MSG91_AUTH_KEY is not configured in environment variables.");
      throw new Error("SMS delivery service is not configured. Please add MSG91_AUTH_KEY to Render environment variables.");
    }
  } else {
    // Non-production fallback when MSG91 is not configured
    if (!authKey) {
      console.info(`[OTP Development Mode] MSG91 is not configured in ${process.env.NODE_ENV}. Using development OTP fallback for ${maskPhone(phone)}.`);
      return { channel: "development", provider: "DEVELOPMENT", developmentOtp: code };
    }
  }

  // Normalize recipient mobile to 91XXXXXXXXXX (standard 12-digit Indian format for MSG91)
  const digits = phone.replace(/\D/g, "");
  const formattedMobile = digits.length === 10 ? `91${digits}` : digits;

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("mobile", formattedMobile);
    url.searchParams.set("otp", code);
    if (templateId) url.searchParams.set("template_id", templateId);
    if (senderId) url.searchParams.set("sender", senderId);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "authkey": authKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: formattedMobile,
        otp: code,
        template_id: templateId || undefined,
      }),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.type === "error")) {
      const errMsg = data?.message || `MSG91 HTTP ${res.status}: ${res.statusText}`;
      console.error(`[MSG91 SMS Error] Failed to send SMS to ${maskPhone(phone)}: ${errMsg}`);
      throw new Error(`SMS delivery failed: ${errMsg}`);
    }

    console.info(`[MSG91 SMS] OTP delivered successfully via SMS to ${maskPhone(phone)}.`);
    return { channel: "sms", provider: "MSG91" };
  } catch (err: any) {
    if (err.message && err.message.startsWith("SMS delivery failed:")) {
      throw err;
    }
    console.error(`[MSG91 SMS Network Error] ${err?.message || err}`);
    throw new Error(`SMS delivery gateway error: ${err?.message || "Failed to contact SMS gateway."}`);
  }
}
