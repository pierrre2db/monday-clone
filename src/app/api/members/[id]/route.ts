import { NextResponse } from "next/server";
import { deleteMemberAndUnassign, updateMember } from "@/db/members";
import { isAdmin } from "@/lib/adminGuard";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }
  const { id } = await params;
  await deleteMemberAndUnassign(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }
  const { id } = await params;
  const { name, avatarColor, role, active, password } = await req.json();
  const updated = await updateMember(id, { name, avatarColor, role, active, password });
  return NextResponse.json(updated);
}
