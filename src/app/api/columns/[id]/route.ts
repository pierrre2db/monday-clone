import { NextResponse } from "next/server";
import { updateColumn, deleteColumn } from "@/db/columns";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json(await updateColumn(id, body));
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  await deleteColumn(id);
  return NextResponse.json({ ok: true });
}
