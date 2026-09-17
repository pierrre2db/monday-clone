import Link from "next/link";
import { listBoards } from "@/db/boards";

export const dynamic = "force-dynamic";
export default async function Home() {
  const boards = await listBoards();
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Boards</h1>
      <ul>{boards.map((b) => <li key={b.id}><Link href={`/board/${b.id}`}>{b.name}</Link></li>)}</ul>
    </main>
  );
}
