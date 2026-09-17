// @vitest-environment node
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

describe("session", () => {
  it("round-trips a signed token", async () => {
    const token = await signSession("secret-key-secret-key-secret-key");
    expect(await verifySession(token, "secret-key-secret-key-secret-key")).toBe(true);
  });
  it("rejects wrong secret", async () => {
    const token = await signSession("secret-key-secret-key-secret-key");
    expect(await verifySession(token, "different-secret-different-secret")).toBe(false);
  });
  it("rejects garbage", async () => {
    expect(await verifySession("garbage", "secret-key-secret-key-secret-key")).toBe(false);
  });
});
