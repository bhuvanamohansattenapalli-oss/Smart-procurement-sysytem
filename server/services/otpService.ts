import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwordService";
import { deliverSms8Otp, maskPhone } from "./sms8Service";

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

export function isOtpDemoMode(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (provider === "demo") {
    return true;
  }
  const demoFlag = process.env.OTP_DEMO_MODE?.trim().toLowerCase();
  if (demoFlag === "true" || demoFlag === "1" || demoFlag === "yes") {
    return true;
  }
  const modeFlag = process.env.OTP_MODE?.trim().toUpperCase();
  if (modeFlag === "DEVELOPMENT") {
    return true;
  }
  return false;
}

export type OtpDelivery = {
  channel: "sms" | "development";
  provider: string;
  developmentOtp?: string;
  messageId?: string;
};

export { maskPhone };

export type SmsProviderResolved = {
  name: "demo" | "msg91" | "sms8" | "custom";
  raw: string;
};

/**
 * Resolves the active SMS provider based on environment variables:
 * - SMS_PROVIDER=demo | msg91 | sms8
 * - Defaults to msg91 when SMS_PROVIDER is not set.
 */
export function resolveSmsProvider(): SmsProviderResolved {
  const raw = process.env.SMS_PROVIDER?.trim() || "";
  const lower = raw.toLowerCase();

  if (isOtpDemoMode() || lower === "demo") {
    return { name: "demo", raw: raw || "demo" };
  }

  if (lower === "sms8") {
    return { name: "sms8", raw };
  }

  if (lower === "msg91") {
    return { name: "msg91", raw };
  }

  if (raw && lower !== "development") {
    return { name: "custom", raw };
  }

  // Default behavior when SMS_PROVIDER is not configured
  return { name: "msg91", raw };
}

export interface SmsProviderHealth {
  provider: "DEMO" | "MSG91" | "SMS8" | "CUSTOM";
  configured: boolean;
  demoMode: boolean;
  sms8Configured: boolean;
  msg91Configured: boolean;
  deviceIdConfigured?: boolean;
}

/**
 * Returns safe SMS provider health and configuration status.
 * NEVER exposes API keys or secrets.
 */
export function getSmsProviderHealth(): SmsProviderHealth {
  const isDemo = isOtpDemoMode();
  const resolved = resolveSmsProvider();
  const sms8Key = Boolean(process.env.SMS8_API_KEY?.trim());
  const msg91Key = Boolean(process.env.MSG91_AUTH_KEY?.trim() || process.env.SMS_API_KEY?.trim());
  const hasDeviceId = Boolean(process.env.SMS8_DEVICE_ID?.trim());

  let isConfigured = false;
  if (isDemo) {
    isConfigured = true;
  } else if (resolved.name === "sms8") {
    isConfigured = sms8Key;
  } else if (resolved.name === "msg91") {
    isConfigured = msg91Key;
  }

  return {
    provider: (isDemo ? "DEMO" : resolved.name.toUpperCase()) as any,
    configured: isConfigured,
    demoMode: isDemo,
    sms8Configured: sms8Key,
    msg91Configured: msg91Key,
    ...(hasDeviceId ? { deviceIdConfigured: true } : {}),
  };
}

/**
 * Existing MSG91 provider implementation preserved exactly.
 */
async function deliverMsg91Otp(phone: string, code: string): Promise<OtpDelivery> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim() || process.env.SMS_API_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim() || process.env.SMS_SENDER_ID?.trim();
  const isDevOrTest = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (!isDevOrTest) {
    // Production/Staging: MSG91_AUTH_KEY is strictly required when OTP_DEMO_MODE is not true.
    if (!authKey) {
      console.error("[OTP Delivery Error] Production SMS failure: MSG91_AUTH_KEY is not configured in environment variables.");
      throw new Error("SMS delivery service is not configured. Please add MSG91_AUTH_KEY to Render environment variables, or enable OTP_DEMO_MODE=true for testing while DLT registration is pending.");
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

/**
 * Deliver OTP using configured SMS provider (demo | msg91 | sms8).
 *
 * When OTP_DEMO_MODE=true or SMS_PROVIDER=demo:
 * - Generates OTP normally without calling SMS8 or MSG91.
 * - Returns OTP for immediate on-screen demo display.
 *
 * When SMS_PROVIDER=sms8:
 * - Dispatches SMS via SMS8 gateway (POST https://app.sms8.io/services/send.php).
 * - Never silently falls back to demo mode on failure.
 * - Never exposes real OTPs or API key in logs or client response.
 *
 * When SMS_PROVIDER=msg91 (or unconfigured):
 * - Preserves existing MSG91 integration and fallback rules.
 */
export async function deliverOtp(phone: string, code: string): Promise<OtpDelivery> {
  const isDemo = isOtpDemoMode();

  // DEMO MODE: If OTP_DEMO_MODE=true or SMS_PROVIDER=demo, bypass real SMS gateways
  if (isDemo) {
    console.info(`[OTP Demo Mode] Demo OTP generated for ${maskPhone(phone)} (SMS delivery paused pending DLT/gateway configuration).`);
    return { channel: "development", provider: "DEMO_MODE", developmentOtp: code };
  }

  const resolved = resolveSmsProvider();

  // Test suite compatibility: if custom uninstalled provider is explicitly set in tests
  if (resolved.name === "custom") {
    throw new Error(`SMS provider '${resolved.raw}' credentials are present, but no server-side adapter has been installed.`);
  }

  // 1. SMS8 Provider
  if (resolved.name === "sms8") {
    return deliverSms8Otp(phone, code);
  }

  // 2. MSG91 Provider (default when SMS_PROVIDER is unset or msg91)
  return deliverMsg91Otp(phone, code);
}
