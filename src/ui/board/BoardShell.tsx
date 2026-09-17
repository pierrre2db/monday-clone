"use client";
import { useState } from "react";
import type { BoardFull, Member } from "./types";
import ViewSwitcher, { type ViewKind } from "./ViewSwitcher";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import { api } from "./api";

export default function BoardShell({ initialBoard, members }: { initialBoard: BoardFull; members: Member[] }) {
  const [board, setBoard] = useState<BoardFull>(initialBoard);
  const [view, setView] = useState<ViewKind>("table");

  function setCellLocal(itemId: string, columnId: string, value: Record<string, unknown>) {
    setBoard((b) => ({
      ...b,
      items: b.items.map((it) => it.id !== itemId ? it : {
        ...it,
        cells: it.cells.some((c) => c.columnId === columnId)
          ? it.cells.map((c) => c.columnId === columnId ? { ...c, value } : c)
          : [...it.cells, { id: `tmp-${columnId}`, itemId, columnId, value }],
      }),
    }));
  }
  async function saveCell(itemId: string, columnId: string, value: Record<string, unknown>) {
    const prev = board;
    setCellLocal(itemId, columnId, value);
    try { await api.setCell(itemId, columnId, value); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }
  async function addItem(groupId: string) {
    const created = await api.addItem(board.id, groupId) as { id: string; name: string; position: number };
    setBoard((b) => ({ ...b, items: [...b.items, { ...created, groupId, cells: [] }] }));
  }

  const shared = { board, members, saveCell, addItem };
  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>{board.name}</h1>
      <ViewSwitcher value={view} onChange={setView} />
      {view === "table" && <TableView {...shared} />}
      {view === "kanban" && <KanbanView {...shared} />}
      {view === "calendar" && <CalendarView board={board} />}
    </main>
  );
}
