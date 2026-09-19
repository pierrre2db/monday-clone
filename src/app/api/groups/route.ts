import { NextResponse } from "next/server";
import { createGroup } from "@/db/groups";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function POST(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { boardId, name } = await req.json();
  return NextResponse.json(await createGroup(boardId, name ?? "New group"), { status: 201 });
}
