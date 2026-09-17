"use client";
import { COLUMN_TYPES } from "@/lib/columns/types";

export default function Toolbar({
  onAddColumn,
  onAddGroup,
}: {
  onAddColumn: (type: string) => void;
  onAddGroup: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button onClick={onAddGroup}>+ Group</button>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            onAddColumn(e.target.value);
            e.target.value = "";
          }
        }}
      >
        <option value="">+ Column…</option>
        {COLUMN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
