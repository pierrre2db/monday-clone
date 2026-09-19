import { SignJWT, jwtVerify } from "jose";

const enc = (secret: string) => new TextEncoder().encode(secret);
export const SESSION_COOKIE = "monday_session";

export type SessionPayload = { uid: string; role: string };

export async function signSession(secret: string, payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}

export async function readSession(
  token: string | undefined,
  secret: string
): Promise<{ ok: boolean; uid: string | null; role: string | null }> {
  if (!token) return { ok: false, uid: null, role: null };
  try {
    const { payload } = await jwtVerify(token, enc(secret));
    const uid = typeof payload.uid === "string" ? payload.uid : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    if (!uid) return { ok: false, uid: null, role: null };
    return { ok: true, uid, role };
  } catch {
    return { ok: false, uid: null, role: null };
  }
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  return (await readSession(token, secret)).ok;
}
