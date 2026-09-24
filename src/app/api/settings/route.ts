import { NextResponse } from "next/server";
import { getDailyCheck, setDailyCheck, getSmtpSafe, setSmtp } from "@/db/settings";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function GET(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  return NextResponse.json({ dailyCheck: await getDailyCheck(), smtp: await getSmtpSafe() });
}

export async function PUT(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { dailyCheck, smtp } = await req.json();
  try {
    if (dailyCheck !== undefined) await setDailyCheck(dailyCheck);
    if (smtp !== undefined) await setSmtp(smtp);
    return NextResponse.json({ dailyCheck: await getDailyCheck(), smtp: await getSmtpSafe() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "invalid settings" }, { status: 400 });
  }
}
