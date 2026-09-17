"use client";
export type ViewKind = "table" | "kanban" | "calendar";

const LABELS: Record<ViewKind, string> = {
  table: "Table",
  kanban: "Kanban",
  calendar: "Calendar",
};

export default function ViewSwitcher({ value, onChange }: { value: ViewKind; onChange: (v: ViewKind) => void }) {
  const kinds: ViewKind[] = ["table", "kanban", "calendar"];
  return (
    <div className="seg" role="group" aria-label="View">
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}
