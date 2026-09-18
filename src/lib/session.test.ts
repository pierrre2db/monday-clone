// @vitest-environment node
import { describe, it, expect } from "vitest";
import { signSession, verifySession, readSession } from "./session";

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
  it("embeds admin=true when requested", async () => {
    const token = await signSession("secret-key-secret-key-secret-key", true);
    expect(await readSession(token, "secret-key-secret-key-secret-key")).toEqual({ ok: true, admin: true });
  });
  it("defaults admin to false", async () => {
    const token = await signSession("secret-key-secret-key-secret-key");
    expect(await readSession(token, "secret-key-secret-key-secret-key")).toEqual({ ok: true, admin: false });
  });
  it("readSession returns ok:false,admin:false on garbage/wrong secret", async () => {
    expect(await readSession("garbage", "secret-key-secret-key-secret-key")).toEqual({ ok: false, admin: false });
    const token = await signSession("secret-key-secret-key-secret-key", true);
    expect(await readSession(token, "different-secret-different-secret")).toEqual({ ok: false, admin: false });
  });
});
