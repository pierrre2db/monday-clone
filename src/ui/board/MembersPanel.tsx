"use client";
import { useState } from "react";
import type { Member } from "./types";
import Button from "@/ui/kit/Button";

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
    <div style={{ minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>Members</span>
        <button onClick={onClose} className="x-btn" aria-label="Close">×</button>
      </div>
      {members.map((m) => (
        <div key={m.id} style={rowStyle}>
          <span style={{ ...swatchStyle, background: m.avatarColor }} />
          <span style={{ flex: 1, fontSize: 13.5 }}>{m.name}</span>
          <button onClick={() => onDelete(m.id)} title="Remove" className="x-btn">×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="New member name"
          className="text-input"
          style={{ fontSize: 13 }}
        />
        <Button type="button" onClick={submit}>+ Add</Button>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "5px 0" };
const swatchStyle: React.CSSProperties = { width: 14, height: 14, borderRadius: "50%", display: "inline-block", flexShrink: 0 };
