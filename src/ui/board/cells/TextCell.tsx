"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TextEditor({ value, onChange }: EditorProps) {
  const [v, setV] = useState((value.text as string) ?? "");
  return <input className="cell-input" value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ text: v })} />;
}
