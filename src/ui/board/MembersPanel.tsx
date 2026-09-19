"use client";
import { useState } from "react";
import type { Member, Role } from "./types";
import Button from "@/ui/kit/Button";
import Avatar from "@/ui/kit/Avatar";
import { Pill } from "@/ui/kit/Pill";

const ROLES: Role[] = ["admin", "member", "viewer"];
const ROLE_COLORS: Record<string, string> = {
  admin: "#e2445c",
  member: "#579bfc",
  viewer: "#9aa1b1",
};

export default function MembersPanel({
  members, isAdmin, onCreate, onDelete, onEdit, onClose,
}: {
  members: Member[];
  isAdmin: boolean;
  onCreate: (data: { name: string; email: string; password: string; role: Role; avatarColor: string }) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { name?: string; role?: Role; active?: boolean; avatarColor?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [color, setColor] = useState("#00c875");

  function submit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password) return;
    onCreate({ name: trimmedName, email: trimmedEmail, password, role, avatarColor: color });
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
  }

  function remove(m: Member) {
    if (!window.confirm(`Supprimer ${m.name} ? Ses affectations seront retirées de tous les items.`)) return;
    onDelete(m.id);
  }

  return (
    <div style={{ minWidth: 280, maxWidth: 320 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>Utilisateurs</span>
        <button onClick={onClose} className="x-btn" aria-label="Close">×</button>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 4 }}>
        {members.map((m) => (
          <div key={m.id} style={rowStyle}>
            <Avatar name={m.name} color={m.avatarColor} size={26} />
            {isAdmin ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                    style={{ fontSize: 13, padding: "3px 6px", width: "100%" }}
                  />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.email}
                  </div>
                </div>
                <select
                  className="view-select"
                  style={{ margin: 0, fontSize: 12, padding: "3px 6px" }}
                  value={m.role}
                  onChange={(e) => onEdit(m.id, { role: e.target.value as Role })}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <label title="Actif" style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={m.active !== false}
                    onChange={(e) => onEdit(m.id, { active: e.target.checked })}
                  />
                </label>
                <input
                  type="color"
                  value={m.avatarColor}
                  onChange={(e) => onEdit(m.id, { avatarColor: e.target.value })}
                  title="Couleur"
                  style={swatchInputStyle}
                />
                <button onClick={() => remove(m)} title="Supprimer" className="x-btn">×</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13.5 }}>{m.name}</span>
                <Pill label={m.role ?? "member"} color={ROLE_COLORS[m.role ?? "member"]} />
              </>
            )}
          </div>
        ))}
      </div>

      {isAdmin ? (
        <div style={{ display: "grid", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="text-input"
            style={{ fontSize: 13 }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="text-input"
            style={{ fontSize: 13 }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            type="password"
            className="text-input"
            style={{ fontSize: 13 }}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              className="view-select"
              style={{ margin: 0, flex: 1 }}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Couleur"
              style={swatchInputStyle}
            />
          </div>
          <Button type="button" onClick={submit}>+ Ajouter un utilisateur</Button>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.4 }}>
          Seul un administrateur peut gérer les utilisateurs.
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
