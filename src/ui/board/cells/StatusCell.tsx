"use client";
import type { EditorProps } from "./registry";
import type { StatusLabel } from "@/lib/columns/types";
export function StatusEditor({ column, value, onChange }: EditorProps) {
  const labels = (column.settings.labels as StatusLabel[]) ?? [];
  const current = labels.find((l) => l.id === value.labelId);
  return (
    <select value={(value.labelId as string) ?? ""} onChange={(e) => onChange({ labelId: e.target.value || null })}
      style={{ background: current?.color ?? "#c4c4c4", color: "#fff", border: "none", padding: "4px" }}>
      <option value="">—</option>
      {labels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  );
}
