import { NextResponse } from "next/server";
import { setCell } from "@/db/cells";

export async function PUT(req: Request) {
  const { itemId, columnId, value } = await req.json();
  try {
    return NextResponse.json(await setCell(itemId, columnId, value ?? {}));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
