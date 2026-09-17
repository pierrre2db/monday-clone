"use client";
import { useState } from "react";
import type { Column } from "./types";
import type { StatusLabel, DropdownOption } from "@/lib/columns/types";
import Button from "@/ui/kit/Button";

function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function ColumnSettings({
  column, onSave, onClose,
}: { column: Column; onSave: (settings: Record<string, unknown>) => void; onClose: () => void }) {
  if (column.type === "status") return <StatusSettings column={column} onSave={onSave} onClose={onClose} />;
  if (column.type === "dropdown") return <DropdownSettings column={column} onSave={onSave} onClose={onClose} />;
  return null;
}

function StatusSettings({
  column, onSave, onClose,
}: { column: Column; onSave: (settings: Record<string, unknown>) => void; onClose: () => void }) {
  const [labels, setLabels] = useState<StatusLabel[]>(
    () => ((column.settings.labels as StatusLabel[]) ?? []).map((l) => ({ ...l })),
  );

  function update(id: string, patch: Partial<StatusLabel>) {
    setLabels((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function remove(id: string) {
    setLabels((ls) => ls.filter((l) => l.id !== id));
  }
  function add() {
    setLabels((ls) => [...ls, { id: uid("s"), label: "New", color: "#c4c4c4" }]);
  }

  return (
    <div style={panelStyle}>
      <div style={headingStyle}>Edit labels</div>
      {labels.map((l) => (
        <div key={l.id} style={rowStyle}>
          <input
            type="color"
            value={l.color}
            onChange={(e) => update(l.id, { color: e.target.value })}
            style={swatchInputStyle}
          />
          <input
            value={l.label}
            onChange={(e) => update(l.id, { label: e.target.value })}
            className="text-input"
            style={{ fontSize: 13 }}
          />
          <button onClick={() => remove(l.id)} title="Remove" className="x-btn">×</button>
        </div>
      ))}
      <button onClick={add} className="add-btn" style={{ marginTop: 6 }}>+ Add label</button>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button type="button" onClick={() => onSave({ labels })}>Save</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function DropdownSettings({
  column, onSave, onClose,
}: { column: Column; onSave: (settings: Record<string, unknown>) => void; onClose: () => void }) {
  const [options, setOptions] = useState<DropdownOption[]>(
    () => ((column.settings.options as DropdownOption[]) ?? []).map((o) => ({ ...o })),
  );

  function update(id: string, patch: Partial<DropdownOption>) {
    setOptions((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function remove(id: string) {
    setOptions((os) => os.filter((o) => o.id !== id));
  }
  function add() {
    setOptions((os) => [...os, { id: uid("o"), label: "New" }]);
  }

  return (
    <div style={panelStyle}>
      <div style={headingStyle}>Edit options</div>
      {options.map((o) => (
        <div key={o.id} style={rowStyle}>
          <input
            value={o.label}
            onChange={(e) => update(o.id, { label: e.target.value })}
            className="text-input"
            style={{ fontSize: 13 }}
          />
          <button onClick={() => remove(o.id)} title="Remove" className="x-btn">×</button>
        </div>
      ))}
      <button onClick={add} className="add-btn" style={{ marginTop: 6 }}>+ Add option</button>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button type="button" onClick={() => onSave({ options })}>Save</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, zIndex: 20,
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
  padding: 12, boxShadow: "var(--shadow-lg)", minWidth: 210,
  textTransform: "none", letterSpacing: "normal", fontWeight: 400,
};
const headingStyle: React.CSSProperties = { fontWeight: 700, fontSize: 13.5, marginBottom: 8, color: "var(--text)" };
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 };
const swatchInputStyle: React.CSSProperties = { width: 28, height: 28, padding: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "transparent", flex: "none" };
