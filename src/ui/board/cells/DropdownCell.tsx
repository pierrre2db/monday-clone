"use client";
import type { EditorProps } from "./registry";
import type { DropdownOption } from "@/lib/columns/types";
export function DropdownEditor({ column, value, onChange }: EditorProps) {
  const options = (column.settings.options as DropdownOption[]) ?? [];
  const selected = (value.optionIds as string[]) ?? [];
  return (
    <select multiple value={selected}
      onChange={(e) => onChange({ optionIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
