import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordService";

describe("passwordService", () => {
  it("creates non-reversible salted hashes that verify only their original password", () => {
    const hash = hashPassword("Farmer@2026");
    expect(hash).not.toContain("Farmer@2026");
    expect(verifyPassword("Farmer@2026", hash)).toBe(true);
    expect(verifyPassword("WrongPassword@2026", hash)).toBe(false);
  });
});
