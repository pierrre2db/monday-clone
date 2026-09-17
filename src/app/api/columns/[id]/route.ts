import { NextResponse } from "next/server";
import { updateColumn, deleteColumn } from "@/db/columns";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateColumn(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteColumn(id);
  return NextResponse.json({ ok: true });
}
