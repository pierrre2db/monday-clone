import { NextResponse } from "next/server";
import { listBoards, createBoard } from "@/db/boards";
import { requireAuth, requireAdmin, isResponse } from "@/lib/authz";

export async function GET(req: Request) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  return NextResponse.json(await listBoards());
}
export async function POST(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createBoard(name.trim()), { status: 201 });
}
