"use client";
import type { BoardFull, Member } from "./types";
type Props = {
  board: BoardFull; members: Member[];
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
};
export default function KanbanView(_props: Props) {
  return <p style={{ color: "#888" }}>Kanban view — coming soon.</p>;
}
