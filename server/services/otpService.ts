import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwordService";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
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

export type OtpDelivery = { channel: "sms" | "development"; provider: string; developmentOtp?: string };

/**
 * Provider boundary only. A real SMS implementation should live here and read
 * its credentials from server-only environment variables; no OTP or credential
 * is ever placed in frontend source.
 */
export async function deliverOtp(phone: string, code: string): Promise<OtpDelivery> {
  const provider = process.env.SMS_PROVIDER?.trim();
  const apiKey = process.env.SMS_API_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim();
  const requestedMode = process.env.OTP_MODE?.trim().toUpperCase();
  const hasCompleteProviderConfig = Boolean(provider && apiKey && senderId && provider.toUpperCase() !== "DEVELOPMENT");
  const useDevelopmentFallback = requestedMode === "DEVELOPMENT" || !hasCompleteProviderConfig;

  if (useDevelopmentFallback) {
    console.info(`[OTP development fallback] phone=${phone} code=${code} expiresInMs=${OTP_TTL_MS}`);
    return { channel: "development", provider: "DEVELOPMENT", developmentOtp: code };
  }

  throw new Error(`SMS provider '${provider}' credentials are present, but no server-side adapter has been installed.`);
}
