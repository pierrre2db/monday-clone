import { NextResponse } from "next/server";
import { updateItem, deleteItem } from "@/db/items";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateItem(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
