"use client";
import type { EditorProps } from "./registry";
export function DateEditor({ value, onChange }: EditorProps) {
  return <input type="date" className="cell-input cell-input--date" value={(value.date as string) ?? ""}
    onChange={(e) => onChange({ date: e.target.value || null })} />;
}
