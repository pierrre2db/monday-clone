import { SignJWT, jwtVerify } from "jose";

const enc = (secret: string) => new TextEncoder().encode(secret);
export const SESSION_COOKIE = "monday_session";

export async function signSession(secret: string): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}
export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, enc(secret));
    return payload.ok === true;
  } catch {
    return false;
  }
}
