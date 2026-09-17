"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function LinkEditor({ value, onChange }: EditorProps) {
  const [url, setUrl] = useState((value.url as string) ?? "");
  return <input className="cell-input" value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)}
    onBlur={() => url && onChange({ url, label: url })} />;
}
