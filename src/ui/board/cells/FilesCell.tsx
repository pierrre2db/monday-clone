"use client";
import type { EditorProps } from "./registry";
import type { FileRef } from "@/lib/columns/types";
export function FilesEditor({ value, onChange }: EditorProps) {
  const files = (value.files as FileRef[]) ?? [];
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) { alert("upload failed"); return; }
    const ref = (await res.json()) as FileRef;
    onChange({ files: [...files, ref] });
  }
  return (
    <span>
      {files.map((f) => <a key={f.id} href={`/api/upload?id=${f.id}`} style={{ marginRight: 6 }}>{f.name}</a>)}
      <input type="file" onChange={upload} />
    </span>
  );
}
