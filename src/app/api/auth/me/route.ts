import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/authz";
import { getMemberById } from "@/db/members";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ authenticated: false, user: null });

  const user = await getMemberById(session.uid);
  if (!user) return NextResponse.json({ authenticated: false, user: null });

  return NextResponse.json({ authenticated: true, user });
}
