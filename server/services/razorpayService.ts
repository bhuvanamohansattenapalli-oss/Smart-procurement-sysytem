import crypto from "node:crypto";

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

const keyId = process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
const apiBase = "https://api.razorpay.com/v1";

export function isRazorpayConfigured() {
  return Boolean(keyId && keySecret);
}

export function getRazorpayPublicConfig() {
  return { configured: isRazorpayConfigured(), keyId: keyId || null, mode: process.env.RAZORPAY_MODE ?? "test" };
}

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder | null> {
  if (!isRazorpayConfigured()) return null;
  const response = await fetch(`${apiBase}/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(input.amount * 100), currency: "INR", receipt: input.receipt, notes: input.notes }),
  });
  if (!response.ok) throw new Error("Razorpay order creation failed.");
  return response.json() as Promise<RazorpayOrder>;
}

export function verifyRazorpaySignature(input: { orderId: string; paymentId: string; signature: string }) {
  if (!keySecret) return false;
  const expected = crypto.createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}

export { keyId as razorpayKeyId };
