import { NextResponse } from "next/server";
import { createItem } from "@/db/items";
import { requireMember, isResponse } from "@/lib/authz";

export async function POST(req: Request) {
  const s = await requireMember(req); if (isResponse(s)) return s;
  const { boardId, groupId, name } = await req.json();
  return NextResponse.json(await createItem(boardId, groupId, name ?? "New item"), { status: 201 });
}
