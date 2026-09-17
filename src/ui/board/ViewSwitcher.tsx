"use client";
export type ViewKind = "table" | "kanban" | "calendar";
export default function ViewSwitcher({ value, onChange }: { value: ViewKind; onChange: (v: ViewKind) => void }) {
  const kinds: ViewKind[] = ["table", "kanban", "calendar"];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {kinds.map((k) => (
        <button key={k} onClick={() => onChange(k)}
          style={{ fontWeight: value === k ? 700 : 400, textTransform: "capitalize" }}>{k}</button>
      ))}
    </div>
  );
}
