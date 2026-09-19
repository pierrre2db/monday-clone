import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { getMemberByEmail } from "@/db/members";
import { verifyPassword } from "@/lib/password";

const INVALID_CREDENTIALS = "Email ou mot de passe invalide";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const member = await getMemberByEmail(email);
  if (!member || !member.active || !verifyPassword(password, member.passwordHash)) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const token = await signSession(process.env.SESSION_SECRET!, { uid: member.id, role: member.role });
  const res = NextResponse.json({
    ok: true,
    user: { id: member.id, name: member.name, email: member.email, role: member.role },
  });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
