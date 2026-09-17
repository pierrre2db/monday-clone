"use client";
import { useState } from "react";
import type { Column } from "./types";
import type { StatusLabel, DropdownOption } from "@/lib/columns/types";

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
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Edit labels</div>
      {labels.map((l) => (
        <div key={l.id} style={rowStyle}>
          <input
            type="color"
            value={l.color}
            onChange={(e) => update(l.id, { color: e.target.value })}
            style={{ width: 28, height: 24, padding: 0, border: "none" }}
          />
          <input
            value={l.label}
            onChange={(e) => update(l.id, { label: e.target.value })}
            style={inputStyle}
          />
          <button onClick={() => remove(l.id)} title="Remove" style={xButtonStyle}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ marginTop: 4 }}>+ Add label</button>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => onSave({ labels })}>Save</button>
        <button onClick={onClose}>Cancel</button>
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
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Edit options</div>
      {options.map((o) => (
        <div key={o.id} style={rowStyle}>
          <input
            value={o.label}
            onChange={(e) => update(o.id, { label: e.target.value })}
            style={inputStyle}
          />
          <button onClick={() => remove(o.id)} title="Remove" style={xButtonStyle}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ marginTop: 4 }}>+ Add option</button>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => onSave({ options })}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, zIndex: 20,
  background: "#fff", border: "1px solid #e6e9ef", borderRadius: 6,
  padding: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 200,
};
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 };
const inputStyle: React.CSSProperties = { flex: 1, border: "1px solid #e6e9ef", borderRadius: 4, padding: "2px 4px", font: "inherit" };
const xButtonStyle: React.CSSProperties = { border: "none", background: "transparent", color: "#9aa1ab", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "2px 4px" };
