import { NextResponse } from "next/server";
import { itemsForMember } from "@/db/people";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await itemsForMember(id));
}
