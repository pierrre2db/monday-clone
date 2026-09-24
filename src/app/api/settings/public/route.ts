import { NextResponse } from "next/server";
import { getDailyCheck } from "@/db/settings";
import { requireAuth, isResponse } from "@/lib/authz";

export async function GET(req: Request) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  return NextResponse.json({ dailyCheck: await getDailyCheck() });
}
