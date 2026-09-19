"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/ui/kit/Button";
import { Pill } from "@/ui/kit/Pill";
import { api, type Me } from "@/ui/board/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#e2445c",
  member: "#579bfc",
  viewer: "#9aa1b1",
};

type Board = { id: string; name: string };

export default function HomeBoards({ initial }: { initial: Board[] }) {
  const [boards, setBoards] = useState<Board[]>(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.getMe().then((res) => setMe(res.user)).catch(() => setMe(null));
  }, []);

  // Server is the real gate; this is UX only — an admin-only control here
  // would 403 for member/viewer, so it's simply not rendered for them.
  const isAdmin = me?.role === "admin";

  async function logout() {
    try { await api.logout(); } finally { window.location.href = "/login"; }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this board?")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" }).then(json);
    setBoards((bs) => bs.filter((b) => b.id !== id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const created = await fetch("/api/boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }).then(json<Board>);
      router.push(`/board/${created.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {me && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{me.name}</span>
          <Pill label={me.role} color={ROLE_COLORS[me.role] ?? "var(--text-muted)"} />
          <Button type="button" variant="ghost" onClick={logout}>Déconnexion</Button>
        </div>
      )}

      {boards.length === 0 ? (
        <p className="empty-state">No boards yet — create your first one below.</p>
      ) : (
        <ul className="board-grid">
          {boards.map((b) => (
            <li key={b.id}>
              <Link href={`/board/${b.id}`} className="board-card">
                {b.name}
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(b.id)}
                  aria-label={`Delete ${b.name}`}
                  title="Delete board"
                  className="x-btn"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <form onSubmit={handleCreate} className="new-board-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New board name"
            className="text-input"
          />
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      )}
    </div>
  );
}
