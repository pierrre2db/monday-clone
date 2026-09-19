import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSession } from "./session";

export type Session = { uid: string; role: string };

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(/; */)) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx) === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return undefined;
}

export async function getSession(req: Request): Promise<Session | null> {
  const token = parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  const s = await readSession(token, process.env.SESSION_SECRET!);
  return s.ok && s.uid ? { uid: s.uid, role: s.role ?? "viewer" } : null;
}

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });

// Guards return the Session when allowed, or a NextResponse to return immediately.
export async function requireAuth(req: Request): Promise<Session | NextResponse> {
  const s = await getSession(req);
  return s ?? unauthorized();
}

export async function requireMember(req: Request): Promise<Session | NextResponse> {
  const s = await getSession(req);
  if (!s) return unauthorized();
  return s.role === "admin" || s.role === "member" ? s : forbidden();
}

export async function requireAdmin(req: Request): Promise<Session | NextResponse> {
  const s = await getSession(req);
  if (!s) return unauthorized();
  return s.role === "admin" ? s : forbidden();
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
