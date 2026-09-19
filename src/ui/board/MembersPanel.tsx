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
  onEdit: (id: string, data: { name?: string; email?: string; role?: Role; active?: boolean; avatarColor?: string; password?: string }) => void;
  onClose: () => void;
}) {
  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [color, setColor] = useState("#00c875");
  // edit form
  const [editingId, setEditingId] = useState<string | null>(null);

  function submitCreate() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password) return;
    onCreate({ name: trimmedName, email: trimmedEmail, password, role, avatarColor: color });
    setName(""); setEmail(""); setPassword(""); setRole("member");
  }

  function remove(m: Member) {
    if (!window.confirm(`Supprimer ${m.name} ? Ses affectations seront retirées de tous les items.`)) return;
    onDelete(m.id);
  }

  const editing = members.find((m) => m.id === editingId) ?? null;

  return (
    <div style={{ minWidth: 280, maxWidth: 340 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>Utilisateurs</span>
        <button onClick={onClose} className="x-btn" aria-label="Close">×</button>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 4 }}>
        {members.map((m) => (
          <div key={m.id} style={rowStyle}>
            <Avatar name={m.name} color={m.avatarColor} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.name}
                {m.active === false && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (inactif)</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.email}
              </div>
            </div>
            <Pill label={m.role ?? "member"} color={ROLE_COLORS[m.role ?? "member"]} />
            {isAdmin && (
              <>
                <button onClick={() => setEditingId(m.id)} title="Modifier" className="x-btn" style={{ fontSize: 13 }}>✎</button>
                <button onClick={() => remove(m)} title="Supprimer" className="x-btn">×</button>
              </>
            )}
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.4 }}>
          Seul un administrateur peut gérer les utilisateurs.
        </p>
      )}

      {isAdmin && editing && (
        <EditForm
          key={editing.id}
          member={editing}
          onCancel={() => setEditingId(null)}
          onSave={(data) => { onEdit(editing.id, data); setEditingId(null); }}
        />
      )}

      {isAdmin && !editing && (
        <div style={{ display: "grid", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Nouvel utilisateur</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="text-input" style={{ fontSize: 13 }} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="text-input" style={{ fontSize: 13 }} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" type="password" className="text-input" style={{ fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select className="view-select" style={{ margin: 0, flex: 1 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Couleur" style={swatchInputStyle} />
          </div>
          <Button type="button" onClick={submitCreate}>+ Ajouter un utilisateur</Button>
        </div>
      )}
    </div>
  );
}

function EditForm({
  member, onSave, onCancel,
}: {
  member: Member;
  onSave: (data: { name: string; email: string; role: Role; avatarColor: string; active: boolean; password?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>((member.role as Role) ?? "member");
  const [color, setColor] = useState(member.avatarColor);
  const [active, setActive] = useState(member.active !== false);

  function save() {
    const n = name.trim(); const em = email.trim();
    if (!n || !em) return;
    onSave({ name: n, email: em, role, avatarColor: color, active, password: password || undefined });
  }

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Modifier {member.name}</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="text-input" style={{ fontSize: 13 }} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="text-input" style={{ fontSize: 13 }} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe (vide = inchangé)" type="password" className="text-input" style={{ fontSize: 13 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select className="view-select" style={{ margin: 0, flex: 1 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Couleur" style={swatchInputStyle} />
        <label title="Actif" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> actif
        </label>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Button type="button" onClick={save}>Enregistrer</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "5px 0" };
const swatchInputStyle: React.CSSProperties = {
  width: 22, height: 22, padding: 0,
  border: "1px solid var(--border)", borderRadius: "50%",
  overflow: "hidden", flexShrink: 0, cursor: "pointer", background: "none",
};
