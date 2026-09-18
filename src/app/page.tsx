import Link from "next/link";
import { listBoards } from "@/db/boards";
import HomeBoards from "@/ui/home/HomeBoards";

export const dynamic = "force-dynamic";
export default async function Home() {
  const boards = await listBoards();
  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1>Boards</h1>
        <Link href="/people" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
          Focus personne →
        </Link>
      </div>
      <HomeBoards initial={boards.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
