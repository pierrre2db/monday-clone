"use client";
import { useState } from "react";
import type { Member } from "./types";

export default function MembersPanel({
  members, onAdd, onDelete, onClose,
}: { members: Member[]; onAdd: (name: string) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>Members</span>
        <button onClick={onClose} style={xButtonStyle}>×</button>
      </div>
      {members.map((m) => (
        <div key={m.id} style={rowStyle}>
          <span style={{ ...swatchStyle, background: m.avatarColor }} />
          <span style={{ flex: 1 }}>{m.name}</span>
          <button onClick={() => onDelete(m.id)} title="Remove" style={xButtonStyle}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="New member name"
          style={inputStyle}
        />
        <button onClick={submit}>+ Add member</button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute", zIndex: 20,
  background: "#fff", border: "1px solid #e6e9ef", borderRadius: 6,
  padding: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 220,
};
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 };
const swatchStyle: React.CSSProperties = { width: 14, height: 14, borderRadius: "50%", display: "inline-block", flexShrink: 0 };
const inputStyle: React.CSSProperties = { flex: 1, border: "1px solid #e6e9ef", borderRadius: 4, padding: "2px 4px", font: "inherit" };
const xButtonStyle: React.CSSProperties = { border: "none", background: "transparent", color: "#9aa1ab", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "2px 4px" };
