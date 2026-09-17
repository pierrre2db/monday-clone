"use client";
import type { EditorProps } from "./registry";
import type { DropdownOption } from "@/lib/columns/types";
import Popover from "@/ui/kit/Popover";
import { Pill } from "@/ui/kit/Pill";
import { colorForId } from "@/ui/kit/colors";

export function DropdownEditor({ column, value, onChange }: EditorProps) {
  const options = (column.settings.options as DropdownOption[]) ?? [];
  const selected = (value.optionIds as string[]) ?? [];
  const selectedOptions = options.filter((o) => selected.includes(o.id));

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((oid) => oid !== id)
      : [...selected, id];
    onChange({ optionIds: next });
  }

  return (
    <Popover
      trigger={({ toggle: open }) => (
        <button type="button" className="cell-trigger" onClick={open}>
          {selectedOptions.length > 0 ? (
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
              {selectedOptions.map((o) => (
                <Pill key={o.id} label={o.label} color={colorForId(o.id)} />
              ))}
            </span>
          ) : (
            <span className="cell-trigger-muted">+</span>
          )}
        </button>
      )}
    >
      {() => (
        <div style={{ display: "grid", gap: 2, minWidth: 180 }}>
          {options.map((o) => {
            const isSelected = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                className="cell-option-row"
                onClick={() => toggle(o.id)}
              >
                <span className="cell-option-dot" style={{ background: colorForId(o.id) }} />
                <span style={{ flex: 1 }}>{o.label}</span>
                {isSelected && <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
