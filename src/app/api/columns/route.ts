import { NextResponse } from "next/server";
import { createColumn } from "@/db/columns";
import { isColumnType } from "@/lib/columns/registry";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function POST(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { boardId, name, type } = await req.json();
  if (!isColumnType(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
  return NextResponse.json(await createColumn(boardId, name ?? "New column", type), { status: 201 });
}
