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

  async function deleteItem(id: string) {
    try {
      await api.deleteItem(id);
      setBoard((b) => ({ ...b, items: b.items.filter((it) => it.id !== id) }));
    } catch (e) { alert((e as Error).message); }
  }
  async function renameItem(id: string, name: string) {
    const prev = board;
    setBoard((b) => ({ ...b, items: b.items.map((it) => (it.id !== id ? it : { ...it, name })) }));
    try { await api.renameItem(id, name); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }
  async function deleteColumn(id: string) {
    if (!window.confirm("Delete this column? This will remove its data from every item.")) return;
    try {
      await api.deleteColumn(id);
      setBoard((b) => ({
        ...b,
        columns: b.columns.filter((c) => c.id !== id),
        items: b.items.map((it) => ({ ...it, cells: it.cells.filter((c) => c.columnId !== id) })),
      }));
    } catch (e) { alert((e as Error).message); }
  }
  async function renameColumn(id: string, name: string) {
    const prev = board;
    setBoard((b) => ({ ...b, columns: b.columns.map((c) => (c.id !== id ? c : { ...c, name })) }));
    try { await api.updateColumn(id, { name }); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }
  async function updateColumnSettings(id: string, settings: Record<string, unknown>) {
    const prev = board;
    setBoard((b) => ({ ...b, columns: b.columns.map((c) => (c.id !== id ? c : { ...c, settings })) }));
    try { await api.updateColumn(id, { settings }); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }
  async function deleteGroup(id: string) {
    if (!window.confirm("Delete this group? This will remove all its items.")) return;
    try {
      await api.deleteGroup(id);
      setBoard((b) => ({
        ...b,
        groups: b.groups.filter((g) => g.id !== id),
        items: b.items.filter((it) => it.groupId !== id),
      }));
    } catch (e) { alert((e as Error).message); }
  }
  async function renameGroup(id: string, name: string) {
    const prev = board;
    setBoard((b) => ({ ...b, groups: b.groups.map((g) => (g.id !== id ? g : { ...g, name })) }));
    try { await api.updateGroup(id, { name }); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }

  const shared = {
    board, members, saveCell, addItem,
    deleteItem, renameItem, deleteColumn, renameColumn, updateColumnSettings, deleteGroup, renameGroup,
  };
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
