"use client";
import type { EditorProps } from "./registry";
export function DateEditor({ value, onChange }: EditorProps) {
  return <input type="date" value={(value.date as string) ?? ""}
    onChange={(e) => onChange({ date: e.target.value || null })} style={{ border: "none" }} />;
}
