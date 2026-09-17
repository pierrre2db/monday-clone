import { NextResponse } from "next/server";
import { createItem } from "@/db/items";

export async function POST(req: Request) {
  const { boardId, groupId, name } = await req.json();
  return NextResponse.json(await createItem(boardId, groupId, name ?? "New item"), { status: 201 });
}
