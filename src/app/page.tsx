import { listBoards } from "@/db/boards";
import HomeBoards from "@/ui/home/HomeBoards";

export const dynamic = "force-dynamic";
export default async function Home() {
  const boards = await listBoards();
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Boards</h1>
      <HomeBoards initial={boards.map((b) => ({ id: b.id, name: b.name }))} />
    </main>
  );
}
