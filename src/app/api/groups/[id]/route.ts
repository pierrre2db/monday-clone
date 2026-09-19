import { NextResponse } from "next/server";
import { updateGroup, deleteGroup } from "@/db/groups";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  return NextResponse.json(await updateGroup(id, await req.json()));
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
