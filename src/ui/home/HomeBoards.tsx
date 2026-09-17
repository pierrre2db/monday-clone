"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/ui/kit/Button";

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
      {boards.length === 0 ? (
        <p className="empty-state">No boards yet — create your first one below.</p>
      ) : (
        <ul className="board-grid">
          {boards.map((b) => (
            <li key={b.id}>
              <Link href={`/board/${b.id}`} className="board-card">
                {b.name}
              </Link>
              <button
                onClick={() => handleDelete(b.id)}
                aria-label={`Delete ${b.name}`}
                title="Delete board"
                className="x-btn"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
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
    </div>
  );
}
