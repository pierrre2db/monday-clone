"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TagsEditor({ value, onChange }: EditorProps) {
  const tags = (value.tags as string[]) ?? [];
  const [v, setV] = useState(tags.join(", "));
  return <input value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
    style={{ width: "100%", border: "none" }} />;
}
