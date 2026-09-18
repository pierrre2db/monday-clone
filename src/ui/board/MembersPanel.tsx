"use client";
import { useState } from "react";
import type { Member } from "./types";
import Button from "@/ui/kit/Button";
import Avatar from "@/ui/kit/Avatar";

export default function MembersPanel({
  members, admin, onAdd, onDelete, onEdit, onClose,
}: {
  members: Member[];
  admin: boolean;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { name?: string; avatarColor?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name}? They will be unassigned from every item.`)) return;
    onDelete(m.id);
  }

  return (
    <div style={{ minWidth: 240 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>Members</span>
        <button onClick={onClose} className="x-btn" aria-label="Close">×</button>
      </div>

      {members.map((m) => (
        <div key={m.id} style={rowStyle}>
          <Avatar name={m.name} color={m.avatarColor} size={24} />
          {admin ? (
            <>
              <input
                key={m.id}
                defaultValue={m.name}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed && trimmed !== m.name) onEdit(m.id, { name: trimmed });
                  else e.target.value = m.name;
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="text-input"
                style={{ flex: 1, fontSize: 13.5, padding: "3px 6px" }}
              />
              <input
                type="color"
                value={m.avatarColor}
                onChange={(e) => onEdit(m.id, { avatarColor: e.target.value })}
                title="Member color"
                style={swatchInputStyle}
              />
              <button onClick={() => remove(m)} title="Remove" className="x-btn">×</button>
            </>
          ) : (
            <span style={{ flex: 1, fontSize: 13.5 }}>{m.name}</span>
          )}
        </div>
      ))}

      {admin ? (
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
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.4 }}>
          Connecte-toi avec le mot de passe admin pour gerer les membres.
        </p>
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "5px 0" };
const swatchInputStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  padding: 0,
  border: "1px solid var(--border)",
  borderRadius: "50%",
  overflow: "hidden",
  flexShrink: 0,
  cursor: "pointer",
  background: "none",
};
