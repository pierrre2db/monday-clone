import { NextResponse } from "next/server";
import { getBoardFull, deleteBoard, renameBoard } from "@/db/boards";
import { requireAuth, requireAdmin, isResponse } from "@/lib/authz";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  const { id } = await params;
  const board = await getBoardFull(id);
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(board);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  const { name } = await req.json();
  return NextResponse.json(await renameBoard(id, name));
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  await deleteBoard(id);
  return NextResponse.json({ ok: true });
}
