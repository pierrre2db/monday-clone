import { SignJWT, jwtVerify } from "jose";

const enc = (secret: string) => new TextEncoder().encode(secret);
export const SESSION_COOKIE = "monday_session";

export async function signSession(secret: string, admin = false): Promise<string> {
  return new SignJWT({ ok: true, admin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}

export async function readSession(
  token: string | undefined,
  secret: string
): Promise<{ ok: boolean; admin: boolean }> {
  if (!token) return { ok: false, admin: false };
  try {
    const { payload } = await jwtVerify(token, enc(secret));
    return { ok: payload.ok === true, admin: payload.admin === true };
  } catch {
    return { ok: false, admin: false };
  }
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  return (await readSession(token, secret)).ok;
}
