import { NextResponse } from "next/server";
import { updateColumn, deleteColumn } from "@/db/columns";
import { isAdmin } from "@/lib/adminGuard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if ("settings" in body && !(await isAdmin(req))) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }
  return NextResponse.json(await updateColumn(id, body));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteColumn(id);
  return NextResponse.json({ ok: true });
}
