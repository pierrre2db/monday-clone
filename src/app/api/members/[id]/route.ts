import { NextResponse } from "next/server";
import { deleteMember } from "@/db/members";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteMember(id);
  return NextResponse.json({ ok: true });
}
