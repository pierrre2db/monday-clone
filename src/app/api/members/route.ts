import { NextResponse } from "next/server";
import { listMembers, createMember } from "@/db/members";

const COLORS = ["#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ff642e"];

export async function GET() {
  return NextResponse.json(await listMembers());
}
export async function POST(req: Request) {
  const { name } = await req.json();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return NextResponse.json(await createMember(name ?? "New member", color), { status: 201 });
}
