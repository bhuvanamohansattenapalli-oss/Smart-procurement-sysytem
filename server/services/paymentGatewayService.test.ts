import { describe, expect, it } from "vitest";
import { ProcureFlowTestGateway } from "./paymentGatewayService";

describe("ProcureFlowTestGateway", () => {
  it("creates traceable intents without credentials and resolves both outcomes", () => {
    const gateway = new ProcureFlowTestGateway();
    const intent = gateway.createIntent({ paymentId: "PAY-2026-1", method: "UPI", amount: 22030 });
    expect(intent.gatewayPaymentId).toMatch(/^GW-/);
    expect(intent.transactionReference).toMatch(/^TXN-/);
    expect(gateway.resolveIntent(intent, "SUCCESS").outcome).toBe("SUCCESS");
    expect(gateway.resolveIntent(intent, "FAILED").failureReason).toContain("could not authorise");
  });
});
