import { notFound } from "next/navigation";
import { getBoardFull } from "@/db/boards";
import { listMembers } from "@/db/members";
import BoardShell from "@/ui/board/BoardShell";
import type { BoardFull, Member } from "@/ui/board/types";

export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoardFull(id);
  if (!board) notFound();
  const members = await listMembers();
  return <BoardShell initialBoard={board as unknown as BoardFull} members={members as Member[]} />;
}
