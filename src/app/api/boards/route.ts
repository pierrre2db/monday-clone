import { NextResponse } from "next/server";
import { listBoards, createBoard } from "@/db/boards";

export async function GET() {
  return NextResponse.json(await listBoards());
}
export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createBoard(name.trim()), { status: 201 });
}
