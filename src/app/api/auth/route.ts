import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  const token = await signSession(process.env.SESSION_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
