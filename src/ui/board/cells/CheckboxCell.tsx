"use client";
import type { EditorProps } from "./registry";
export function CheckboxEditor({ value, onChange }: EditorProps) {
  return <input type="checkbox" checked={value.checked === true}
    onChange={(e) => onChange({ checked: e.target.checked })} />;
}
