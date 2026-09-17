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
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 0 }}>
      {files.map((f) => (
        <a key={f.id} href={`/api/upload?id=${f.id}`} className="cell-file-chip">
          {f.name}
        </a>
      ))}
      <label className="cell-file-input-label">
        + File
        <input type="file" onChange={upload} />
      </label>
    </span>
  );
}
