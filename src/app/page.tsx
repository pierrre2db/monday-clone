import { listBoards } from "@/db/boards";
import HomeBoards from "@/ui/home/HomeBoards";

export const dynamic = "force-dynamic";
export default async function Home() {
  const boards = await listBoards();
  return (
    <div className="wrap">
      <h1>Boards</h1>
      <HomeBoards initial={boards.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
