import { NextResponse } from "next/server";
import { createGroup } from "@/db/groups";

export async function POST(req: Request) {
  const { boardId, name } = await req.json();
  return NextResponse.json(await createGroup(boardId, name ?? "New group"), { status: 201 });
}
