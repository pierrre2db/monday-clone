import { NextResponse } from "next/server";
import { deleteMemberAndUnassign, updateMember } from "@/db/members";
import { requireAdmin, isResponse } from "@/lib/authz";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  await deleteMemberAndUnassign(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { id } = await params;
  const { name, email, avatarColor, role, active, password } = await req.json();
  try {
    const updated = await updateMember(id, { name, email, avatarColor, role, active, password });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
