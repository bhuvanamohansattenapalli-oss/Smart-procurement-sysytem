import { describe, expect, it } from "vitest";
import { createMockAssistantReply } from "./mockAiService";

const context = { farmerName: "Ramesh", bookingCode: "BK-2026-7294", tokenNumber: "P-042", centreName: "Nizamabad Market Yard", slotDate: "2026-03-18", slotTime: "10:30 – 11:00", queuePosition: 2, peopleAhead: 1, estimatedWaitMinutes: 4, procurementStatus: "BOOKED" };

describe("createMockAssistantReply", () => {
  it("uses booking context without needing a third-party model key", () => {
    const response = createMockAssistantReply("How long is my queue?", context);
    expect(response).toContain("1 farmer");
    expect(response).toContain("4 minutes");
  });
});
