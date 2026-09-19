// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("produces a salt:hash string different from the plaintext", () => {
    const stored = hashPassword("hunter2");
    expect(stored).toContain(":");
    expect(stored).not.toBe("hunter2");
  });

  it("verifies a correct password", () => {
    const stored = hashPassword("hunter2");
    expect(verifyPassword("hunter2", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("hunter2");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("rejects a malformed stored value", () => {
    expect(verifyPassword("hunter2", "x")).toBe(false);
  });

  it("produces different hashes for the same password (random salt)", () => {
    const a = hashPassword("hunter2");
    const b = hashPassword("hunter2");
    expect(a).not.toBe(b);
  });
});
