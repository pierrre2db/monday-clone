"use client";
import { useState } from "react";
import type { BoardFull, Column, Group, Member } from "./types";
import ViewSwitcher, { type ViewKind } from "./ViewSwitcher";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import Toolbar from "./Toolbar";
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
  async function addGroup() {
    // api.addGroup returns Promise<unknown> (json<T> has no explicit T here), so we
    // assert the real shape returned by POST /api/groups (see src/db/groups.ts) rather
    // than widen Group's fields away.
    const g = (await api.addGroup(board.id)) as Group;
    setBoard((b) => ({ ...b, groups: [...b.groups, g] }));
  }
  async function addColumn(type: string) {
    // Same story as addGroup: POST /api/columns (src/app/api/columns/route.ts) calls
    // createColumn, which validates `type` via isColumnType and seeds `settings` via
    // defaultSettings(type) server-side, so the response really does satisfy Column
    // (including the narrow ColumnType union) even though the client-side type is
    // erased to unknown by the generic `json<T>` helper.
    const c = (await api.addColumn(board.id, type)) as Column;
    setBoard((b) => ({ ...b, columns: [...b.columns, c] }));
  }

  const shared = { board, members, saveCell, addItem };
  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>{board.name}</h1>
      <ViewSwitcher value={view} onChange={setView} />
      <Toolbar onAddColumn={addColumn} onAddGroup={addGroup} />
      {view === "table" && <TableView {...shared} />}
      {view === "kanban" && <KanbanView {...shared} />}
      {view === "calendar" && <CalendarView board={board} />}
    </main>
  );
}
