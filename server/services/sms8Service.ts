import { normalizePhone } from "../db";

export const SMS8_SEND_URL = "https://app.sms8.io/services/send.php";
export const SMS8_DEFAULT_TIMEOUT_MS = 10_000;

export interface Sms8DeliveryResult {
  channel: "sms";
  provider: "SMS8";
  messageId?: string;
}

/**
 * Masks a phone number for safe diagnostic logging (e.g. 98******10).
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return digits.slice(0, 2) + "******" + digits.slice(-2);
}

/**
 * Normalizes phone number to standard Indian E.164 representation (+91XXXXXXXXXX)
 * using the application's existing normalizePhone logic.
 */
export function formatE164Phone(rawPhone: string): string {
  const cleaned = normalizePhone(rawPhone);
  if (!cleaned) return "";

  // If the raw phone originally had an international country code other than India:
  const rawDigits = rawPhone.replace(/\D/g, "");
  if (rawPhone.trim().startsWith("+") && rawDigits.length > 10 && !rawDigits.startsWith("91")) {
    return `+${rawDigits}`;
  }

  // Standard Indian 10-digit mobile to E.164 (+91XXXXXXXXXX)
  return `+91${cleaned}`;
}

/**
 * Formats the standard OTP message text for SMS8 delivery.
 */
export function formatSms8OtpMessage(code: string): string {
  return `Your ProcureFlow OTP is ${code}. Do not share it with anyone.`;
}

/**
 * Internal error class for SMS delivery failures with a safe, farmer-friendly user message.
 */
export class SmsDeliveryError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "SMS_DELIVERY_FAILED", statusCode = 502) {
    super(message);
    this.name = "SmsDeliveryError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Deliver an OTP code via SMS8 gateway (POST https://app.sms8.io/services/send.php)
 *
 * Security & Reliability Guarantees:
 * 1. Strictly backend-only; API key is fetched from process.env.SMS8_API_KEY.
 * 2. Real OTP and API keys are NEVER logged or exposed.
 * 3. 10-second HTTP timeout ensures the registration request never hangs.
 * 4. Safe user-facing error messages on all failure codes.
 */
export async function deliverSms8Otp(phone: string, code: string): Promise<Sms8DeliveryResult> {
  const apiKey = process.env.SMS8_API_KEY?.trim();
  const deviceId = process.env.SMS8_DEVICE_ID?.trim();
  const maskedNumber = maskPhone(phone);

  if (!apiKey) {
    console.error("[SMS8 Delivery Error] Production SMS failure: SMS8_API_KEY is not configured in environment variables.");
    throw new SmsDeliveryError(
      "SMS8 delivery service is not configured. Please set SMS8_API_KEY in environment variables.",
      "SMS8_NOT_CONFIGURED",
      500
    );
  }

  const e164Number = formatE164Phone(phone);
  if (!e164Number || e164Number.length < 12) {
    console.error(`[SMS8 Delivery Error] Malformed phone number provided for delivery: ${maskedNumber}`);
    throw new SmsDeliveryError("Invalid mobile phone number for SMS delivery.", "MALFORMED_PHONE", 400);
  }

  const otpMessage = formatSms8OtpMessage(code);

  const params = new URLSearchParams();
  params.set("key", apiKey);
  params.set("number", e164Number);
  params.set("message", otpMessage);
  params.set("prioritize", "1");
  if (deviceId) {
    params.set("devices", deviceId);
  }

  const timeoutMs = Number(process.env.SMS8_TIMEOUT_MS) || SMS8_DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(SMS8_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timer);
    const isTimeout = netErr?.name === "AbortError" || netErr?.name === "TimeoutError";
    if (isTimeout) {
      console.error(`[SMS8 Gateway Timeout] Request timed out after ${timeoutMs}ms for ${maskedNumber}`);
      throw new SmsDeliveryError("SMS delivery timed out. Please try again later.", "SMS_GATEWAY_TIMEOUT", 504);
    }
    console.error(`[SMS8 Network Error] Failed to reach SMS8 service for ${maskedNumber}: ${netErr?.message || netErr}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please try again later.", "SMS_NETWORK_ERROR", 502);
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  const rawText = await response.text();
  try {
    body = JSON.parse(rawText);
  } catch {
    console.error(`[SMS8 Response Error] Non-JSON payload received from SMS8 (HTTP ${response.status}) for ${maskedNumber}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please try again later.", "SMS_UNEXPECTED_RESPONSE", 502);
  }

  // Inspect HTTP status or JSON error payload
  const errCode = body?.error?.code ?? response.status;
  const rawErrorMessage = body?.error?.message ?? (typeof body?.error === "string" ? body.error : "");

  // 1. Invalid API key / Auth failure (401)
  if (response.status === 401 || errCode === 401 || /invalid (api )?key|unauthorized/i.test(rawErrorMessage)) {
    console.error(`[SMS8 Auth Error] SMS8 rejected API key (HTTP 401) for recipient ${maskedNumber}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please try again later.", "SMS_AUTH_FAILED", 401);
  }

  // 2. Insufficient credits / Out of balance (402)
  if (response.status === 402 || errCode === 402 || /credit|balance|insufficient/i.test(rawErrorMessage)) {
    console.error(`[SMS8 Balance Error] Insufficient SMS credits (HTTP 402) for recipient ${maskedNumber}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please try again later.", "SMS_OUT_OF_CREDITS", 402);
  }

  // 3. Rate limit / Too many requests (429)
  if (response.status === 429 || errCode === 429 || /rate limit|too many/i.test(rawErrorMessage)) {
    console.error(`[SMS8 Rate Limit] Rate limit exceeded (HTTP 429) for recipient ${maskedNumber}`);
    throw new SmsDeliveryError("Too many SMS requests sent. Please try again later.", "SMS_RATE_LIMITED", 429);
  }

  // 4. Malformed request (400)
  if (response.status === 400 || errCode === 400 || /malformed|invalid number/i.test(rawErrorMessage)) {
    console.error(`[SMS8 Request Error] Malformed request (HTTP 400) for recipient ${maskedNumber}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please verify your mobile number or try again.", "SMS_BAD_REQUEST", 400);
  }

  // 5. Server error (500+)
  if (response.status >= 500 || (typeof errCode === "number" && errCode >= 500)) {
    console.error(`[SMS8 Server Error] Gateway returned server error (HTTP ${response.status}) for recipient ${maskedNumber}`);
    throw new SmsDeliveryError("SMS gateway temporarily unavailable. Please try again later.", "SMS_SERVER_ERROR", 502);
  }

  // 6. Generic failure response (success is false)
  if (body.success !== true) {
    console.error(`[SMS8 Rejection Error] SMS8 returned failure for recipient ${maskedNumber}: ${rawErrorMessage || "unknown"}`);
    throw new SmsDeliveryError("Unable to send OTP right now. Please try again later.", "SMS_DELIVERY_FAILED", 502);
  }

  // Success
  const firstMsg = Array.isArray(body?.data?.messages) ? body.data.messages[0] : null;
  const messageId = firstMsg?.id ? String(firstMsg.id) : undefined;

  console.info(`[SMS8 Delivery Success] OTP dispatched successfully via SMS8 to ${maskedNumber}.${deviceId ? ` Routed via device ${deviceId}.` : ""}`);

  return {
    channel: "sms",
    provider: "SMS8",
    messageId,
  };
}
