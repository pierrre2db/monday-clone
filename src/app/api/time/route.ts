import { NextResponse } from "next/server";
import { addTime, listItemTime } from "@/db/time";
import { requireAuth, requireMember, isResponse } from "@/lib/authz";
import { todayISO } from "@/lib/date";

export async function POST(req: Request) {
  const s = await requireMember(req); if (isResponse(s)) return s;
  const { itemId, minutes, date, note } = await req.json();
  try {
    const entry = await addTime({
      itemId,
      memberId: s.uid,
      minutes,
      date: date ?? todayISO(),
      note: note ?? "",
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to add time" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  return NextResponse.json(await listItemTime(itemId));
}
