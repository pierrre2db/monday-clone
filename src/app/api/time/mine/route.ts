import { NextResponse } from "next/server";
import { listMemberTime } from "@/db/time";
import { requireAuth, isResponse } from "@/lib/authz";
import { todayISO } from "@/lib/date";

export async function GET(req: Request) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  const { searchParams } = new URL(req.url);
  const today = todayISO();
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? today;
  const entries = await listMemberTime(s.uid, from, to);
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  return NextResponse.json({ entries, totalMinutes });
}
