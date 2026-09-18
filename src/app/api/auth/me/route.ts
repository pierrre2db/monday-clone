import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { ok, admin } = await readSession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET!);
  return NextResponse.json({ authenticated: ok, admin });
}
