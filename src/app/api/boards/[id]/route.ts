import { NextResponse } from "next/server";
import { getBoardFull, deleteBoard, renameBoard } from "@/db/boards";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoardFull(id);
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(board);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  return NextResponse.json(await renameBoard(id, name));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteBoard(id);
  return NextResponse.json({ ok: true });
}
