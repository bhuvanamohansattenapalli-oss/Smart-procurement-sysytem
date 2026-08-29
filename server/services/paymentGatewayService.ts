export type PaymentMethod = "UPI" | "CARD" | "NET_BANKING";
export type PaymentOutcome = "SUCCESS" | "FAILED";

export type GatewayIntent = {
  gateway: string;
  gatewayPaymentId: string;
  paymentId: string;
  transactionReference: string;
};

export type GatewayResolution = {
  outcome: PaymentOutcome;
  gatewayPaymentId: string;
  transactionReference: string;
  failureReason?: string;
};

/**
 * Boundary for a future provider SDK. This test adapter intentionally receives
 * no secret or raw card data; a production adapter should be server-only and
 * verify provider-signed webhook events before resolving a payment.
 */
export interface PaymentGatewayAdapter {
  createIntent(input: { paymentId: string; method: PaymentMethod; amount: number }): GatewayIntent;
  resolveIntent(input: GatewayIntent, outcome: PaymentOutcome): GatewayResolution;
}

export class ProcureFlowTestGateway implements PaymentGatewayAdapter {
  createIntent(input: { paymentId: string; method: PaymentMethod; amount: number }): GatewayIntent {
    const suffix = `${Date.now().toString(36).toUpperCase()}${input.method.slice(0, 2)}`;
    return { gateway: "PROCUREFLOW_TEST_GATEWAY", gatewayPaymentId: `GW-${suffix}`, paymentId: input.paymentId, transactionReference: `TXN-${suffix}` };
  }

  resolveIntent(input: GatewayIntent, outcome: PaymentOutcome): GatewayResolution {
    return outcome === "SUCCESS"
      ? { outcome, gatewayPaymentId: input.gatewayPaymentId, transactionReference: input.transactionReference }
      : { outcome, gatewayPaymentId: input.gatewayPaymentId, transactionReference: input.transactionReference, failureReason: "The payment provider could not authorise this attempt. Please try another method." };
  }
}

export const paymentGateway = new ProcureFlowTestGateway();
