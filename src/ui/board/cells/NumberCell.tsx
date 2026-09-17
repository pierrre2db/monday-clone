"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function NumberEditor({ value, onChange }: EditorProps) {
  const [v, setV] = useState(value.number == null ? "" : String(value.number));
  return <input type="number" className="cell-input" value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ number: v === "" ? null : Number(v) })} />;
}
