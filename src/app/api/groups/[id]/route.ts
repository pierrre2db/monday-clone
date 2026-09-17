import { NextResponse } from "next/server";
import { updateGroup, deleteGroup } from "@/db/groups";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateGroup(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
