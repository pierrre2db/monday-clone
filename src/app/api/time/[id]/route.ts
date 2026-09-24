import { NextResponse } from "next/server";
import { getTimeEntry, deleteTime } from "@/db/time";
import { requireMember, isResponse, forbidden } from "@/lib/authz";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireMember(req); if (isResponse(s)) return s;
  const { id } = await params;
  const entry = await getTimeEntry(id);
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (entry.memberId !== s.uid && s.role !== "admin") return forbidden();
  await deleteTime(id);
  return NextResponse.json({ ok: true });
}
