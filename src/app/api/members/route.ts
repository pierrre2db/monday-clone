import { NextResponse } from "next/server";
import { listMembers, createMember } from "@/db/members";
import { requireAuth, requireAdmin, isResponse } from "@/lib/authz";

const COLORS = ["#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ff642e"];

export async function GET(req: Request) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  return NextResponse.json(await listMembers());
}
export async function POST(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;
  const { name, email, password, role, avatarColor } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  const color = avatarColor ?? COLORS[Math.floor(Math.random() * COLORS.length)];
  try {
    const member = await createMember({ name: name ?? "New member", email, password, role, avatarColor: color });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to create member" }, { status: 400 });
  }
}
