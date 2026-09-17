"use client";
import type { EditorProps } from "./registry";
export function PersonEditor({ members, value, onChange }: EditorProps) {
  const selected = (value.memberIds as string[]) ?? [];
  return (
    <select multiple value={selected}
      onChange={(e) => onChange({ memberIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}
