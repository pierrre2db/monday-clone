"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

type Board = { id: string; name: string };

export default function HomeBoards({ initial }: { initial: Board[] }) {
  const [boards, setBoards] = useState<Board[]>(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

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
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {boards.map((b) => (
          <li
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
            }}
          >
            <Link href={`/board/${b.id}`} style={{ flex: 1 }}>
              {b.name}
            </Link>
            <button
              onClick={() => handleDelete(b.id)}
              aria-label={`Delete ${b.name}`}
              title="Delete board"
              style={{
                background: "none",
                border: "none",
                color: "#999",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: "2px 6px",
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleCreate}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name"
          style={{
            flex: 1,
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontFamily: "inherit",
            fontSize: 14,
          }}
        />
        <button type="submit" disabled={creating || !name.trim()}>
          {creating ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
