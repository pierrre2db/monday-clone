"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BoardFull, Column, Filters, Group, Member } from "./types";
import ViewSwitcher, { type ViewKind } from "./ViewSwitcher";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import ItemDetailPanel from "./ItemDetailPanel";
import Toolbar from "./Toolbar";
import FilterBar from "./FilterBar";
import MembersPanel from "./MembersPanel";
import Button from "@/ui/kit/Button";
import ThemeToggle from "@/ui/kit/ThemeToggle";
import Popover from "@/ui/kit/Popover";
import { api } from "./api";

const EMPTY_FILTERS: Filters = { memberIds: [], labelIds: [], groupIds: [] };

export default function BoardShell({ initialBoard, members: initialMembers }: { initialBoard: BoardFull; members: Member[] }) {
  const [board, setBoard] = useState<BoardFull>(initialBoard);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [view, setView] = useState<ViewKind>("table");
  const [admin, setAdmin] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  // Tracks which board's filters are currently loaded into state, so the persist
  // effect below never fires with a stale (pre-load) `filters` closure — without
  // this guard, the load effect's setFilters() and the persist effect can race on
  // mount and the persist effect clobbers the just-loaded value back to empty
  // before the loaded state has actually rendered.
  const [readyBoardId, setReadyBoardId] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then((me) => setAdmin(me.admin)).catch(() => setAdmin(false));
  }, []);

  // Load persisted filters for this board on mount / board change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`mk-filters-${board.id}`);
      const parsed = raw ? JSON.parse(raw) : null;
      setFilters({
        memberIds: Array.isArray(parsed?.memberIds) ? parsed.memberIds : [],
        labelIds: Array.isArray(parsed?.labelIds) ? parsed.labelIds : [],
        groupIds: Array.isArray(parsed?.groupIds) ? parsed.groupIds : [],
      });
    } catch {
      setFilters(EMPTY_FILTERS);
    }
    setReadyBoardId(board.id);
  }, [board.id]);

  // Persist filters for this board whenever they change — but only once the load
  // above has applied for this board id (see readyBoardId comment).
  useEffect(() => {
    if (readyBoardId !== board.id) return;
    try {
      localStorage.setItem(`mk-filters-${board.id}`, JSON.stringify(filters));
    } catch {
      // ignore (private browsing / storage disabled)
    }
  }, [board.id, filters, readyBoardId]);

  // Derive the item set the active views should render. Mutation handlers below
  // (saveCell, addItem, ...) always operate on the real `board` state — only the
  // *view input* is filtered, computed here at render time.
  const visibleItems = useMemo(() => {
    const anyMember = filters.memberIds.length > 0;
    const anyLabel = filters.labelIds.length > 0;
    const anyGroup = filters.groupIds.length > 0;
    if (!anyMember && !anyLabel && !anyGroup) return board.items;

    const personColumnIds = new Set(board.columns.filter((c) => c.type === "person").map((c) => c.id));
    const statusColumnIds = new Set(board.columns.filter((c) => c.type === "status").map((c) => c.id));

    return board.items.filter((item) => {
      if (anyGroup && !filters.groupIds.includes(item.groupId)) return false;

      if (anyMember) {
        const matches = item.cells.some((c) => {
          if (!personColumnIds.has(c.columnId)) return false;
          const ids = (c.value as { memberIds?: string[] })?.memberIds ?? [];
          return ids.some((id) => filters.memberIds.includes(id));
        });
        if (!matches) return false;
      }

      if (anyLabel) {
        const matches = item.cells.some((c) => {
          if (!statusColumnIds.has(c.columnId)) return false;
          const labelId = (c.value as { labelId?: string | null })?.labelId;
          return labelId != null && filters.labelIds.includes(labelId);
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [board.items, board.columns, filters]);

  const filteredBoard = useMemo(() => ({ ...board, items: visibleItems }), [board, visibleItems]);
  const hiddenCount = board.items.length - visibleItems.length;

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

  async function addMember(name: string) {
    const m = (await api.addMember(name)) as Member;
    setMembers((ms) => [...ms, m]);
  }
  async function deleteMember(id: string) {
    const prev = members;
    setMembers((ms) => ms.filter((m) => m.id !== id));
    try { await api.deleteMember(id); }
    catch (e) { setMembers(prev); alert((e as Error).message); }
  }
  async function editMember(id: string, data: { name?: string; avatarColor?: string }) {
    const prev = members;
    setMembers((ms) => ms.map((m) => (m.id !== id ? m : { ...m, ...data })));
    try { await api.updateMember(id, data); }
    catch (e) { setMembers(prev); alert((e as Error).message); }
  }

  function onOpenItem(id: string) {
    setOpenItemId(id);
  }

  const shared = {
    board: filteredBoard, members, admin, saveCell, addItem,
    deleteItem, renameItem, deleteColumn, renameColumn, updateColumnSettings, deleteGroup, renameGroup,
    onOpenItem,
  };
  const groupCount = board.groups.length;
  const itemCount = board.items.length;
  const initial = board.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="wrap">
      <div className="board-head">
        <div className="board-emoji">{initial}</div>
        <div>
          <h1>{board.name}</h1>
          <p>
            {groupCount} {groupCount === 1 ? "group" : "groups"} · {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <ViewSwitcher value={view} onChange={setView} />
        <div className="toolbar-actions">
          <Toolbar onAddColumn={addColumn} onAddGroup={addGroup} />
          <Popover
            align="right"
            trigger={({ toggle }) => (
              <Button type="button" onClick={toggle}>Members</Button>
            )}
          >
            {({ close }) => (
              <MembersPanel
                members={members}
                admin={admin}
                onAdd={addMember}
                onDelete={deleteMember}
                onEdit={editMember}
                onClose={close}
              />
            )}
          </Popover>
          <Link href="/people" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
            Focus personne
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <FilterBar board={board} members={members} filters={filters} onChange={setFilters} />
      {hiddenCount > 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "-6px 0 14px" }}>
          {hiddenCount} item{hiddenCount > 1 ? "s" : ""} masqué{hiddenCount > 1 ? "s" : ""}
        </p>
      )}

      {view === "table" && <TableView {...shared} />}
      {view === "kanban" && <KanbanView {...shared} />}
      {view === "calendar" && <CalendarView board={filteredBoard} onOpenItem={onOpenItem} />}

      {openItemId && board.items.some((i) => i.id === openItemId) && (
        <ItemDetailPanel
          item={board.items.find((i) => i.id === openItemId)!}
          board={board}
          members={members}
          onClose={() => setOpenItemId(null)}
          saveCell={saveCell}
          renameItem={renameItem}
          deleteItem={(id) => { deleteItem(id); setOpenItemId(null); }}
        />
      )}
    </div>
  );
}
