// @vitest-environment node
import { describe, it, expect } from "vitest";
import { signSession, verifySession, readSession } from "./session";

describe("session", () => {
  it("round-trips a signed token", async () => {
    const token = await signSession("secret-key-secret-key-secret-key", { uid: "u1", role: "admin" });
    expect(await verifySession(token, "secret-key-secret-key-secret-key")).toBe(true);
  });
  it("rejects wrong secret", async () => {
    const token = await signSession("secret-key-secret-key-secret-key", { uid: "u1", role: "admin" });
    expect(await verifySession(token, "different-secret-different-secret")).toBe(false);
  });
  it("rejects garbage", async () => {
    expect(await verifySession("garbage", "secret-key-secret-key-secret-key")).toBe(false);
  });
  it("embeds uid and role", async () => {
    const token = await signSession("secret-key-secret-key-secret-key", { uid: "u1", role: "admin" });
    expect(await readSession(token, "secret-key-secret-key-secret-key")).toEqual({
      ok: true,
      uid: "u1",
      role: "admin",
    });
  });
  it("readSession returns ok:false,uid:null,role:null on garbage/wrong secret", async () => {
    expect(await readSession("garbage", "secret-key-secret-key-secret-key")).toEqual({
      ok: false,
      uid: null,
      role: null,
    });
    const token = await signSession("secret-key-secret-key-secret-key", { uid: "u1", role: "admin" });
    expect(await readSession(token, "different-secret-different-secret")).toEqual({
      ok: false,
      uid: null,
      role: null,
    });
  });
});
