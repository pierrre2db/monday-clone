import { NextResponse } from "next/server";
import { itemsForMember } from "@/db/people";
import { requireAuth, isResponse } from "@/lib/authz";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAuth(req); if (isResponse(s)) return s;
  const { id } = await params;
  return NextResponse.json(await itemsForMember(id));
}
