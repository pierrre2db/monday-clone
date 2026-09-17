"use client";
import type { EditorProps } from "./registry";
import type { StatusLabel } from "@/lib/columns/types";
import Popover from "@/ui/kit/Popover";
import { StatusChip } from "@/ui/kit/Chip";

export function StatusEditor({ column, value, onChange }: EditorProps) {
  const labels = (column.settings.labels as StatusLabel[]) ?? [];
  const current = labels.find((l) => l.id === value.labelId);

  return (
    <Popover
      trigger={({ toggle }) => (
        <button type="button" className="cell-trigger" onClick={toggle}>
          {current ? (
            <StatusChip label={current.label} color={current.color} />
          ) : (
            <StatusChip label="—" />
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div style={{ display: "grid", gap: 2, minWidth: 160 }}>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              className="cell-option-row"
              onClick={() => {
                onChange({ labelId: l.id });
                close();
              }}
            >
              <span className="cell-option-dot" style={{ background: l.color }} />
              {l.label}
            </button>
          ))}
          <button
            type="button"
            className="cell-option-row"
            style={{ color: "var(--text-muted)" }}
            onClick={() => {
              onChange({ labelId: null });
              close();
            }}
          >
            Clear
          </button>
        </div>
      )}
    </Popover>
  );
}
