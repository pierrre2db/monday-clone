import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const DIR = process.env.UPLOAD_DIR ?? "/data/uploads";
const MAX = Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760);

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "file too large" }, { status: 413 });
  const id = randomUUID() + extname(file.name);
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, id), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ id, name: file.name, size: file.size });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.includes("/") || id.includes("..")) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const path = join(DIR, id);
  try {
    await stat(path);
    const buf = await readFile(path);
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/octet-stream", "content-disposition": `inline; filename="${id}"` } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
