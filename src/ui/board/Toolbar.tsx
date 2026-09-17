"use client";
import { COLUMN_TYPES } from "@/lib/columns/types";
import Button from "@/ui/kit/Button";

export default function Toolbar({
  onAddColumn,
  onAddGroup,
}: {
  onAddColumn: (type: string) => void;
  onAddGroup: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <Button type="button" onClick={onAddGroup}>+ Group</Button>
      <select
        className="view-select"
        style={{ margin: 0 }}
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
