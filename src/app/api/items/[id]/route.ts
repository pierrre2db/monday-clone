import { NextResponse } from "next/server";
import { updateItem, deleteItem } from "@/db/items";
import { requireMember, isResponse } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireMember(req); if (isResponse(s)) return s;
  const { id } = await params;
  return NextResponse.json(await updateItem(id, await req.json()));
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireMember(req); if (isResponse(s)) return s;
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
