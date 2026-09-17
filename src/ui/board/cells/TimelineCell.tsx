"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TimelineEditor({ value, onChange }: EditorProps) {
  const [start, setStart] = useState((value.start as string) ?? "");
  const [end, setEnd] = useState((value.end as string) ?? "");
  function commit(s: string, e: string) { if (s && e) onChange({ start: s, end: e }); else onChange({ start: null, end: null }); }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input type="date" className="cell-input cell-input--date" value={start}
        onChange={(e) => { setStart(e.target.value); commit(e.target.value, end); }} />
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
      <input type="date" className="cell-input cell-input--date" value={end}
        onChange={(e) => { setEnd(e.target.value); commit(start, e.target.value); }} />
    </span>
  );
}
