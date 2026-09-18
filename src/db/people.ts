import { prisma } from "@/lib/db";
import type { StatusLabel } from "@/lib/columns/types";

export type PersonActivityRow = {
  boardId: string;
  boardName: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  itemId: string;
  itemName: string;
  status: { label: string; color: string } | null;
  due: string | null;
};

/**
 * All items assigned to `memberId` on any person-type column, across every board.
 *
 * Matching strategy: person cell values are `{ memberIds: string[] }`. Prisma 7's
 * JSON filter `array_contains` with a scalar string was verified (via a scratch
 * script against this project's Postgres 16 instance) to correctly test "is this
 * scalar an element of the JSON array" — it does not false-match substrings or
 * unrelated members, and correctly returns zero rows for an unassigned member.
 * So we filter at the DB layer rather than pulling every person cell and
 * filtering in JS.
 */
export async function itemsForMember(memberId: string): Promise<PersonActivityRow[]> {
  const personColumns = await prisma.column.findMany({ where: { type: "person" } });
  const personColIds = personColumns.map((c) => c.id);
  if (personColIds.length === 0) return [];

  const assignedCells = await prisma.cellValue.findMany({
    where: {
      columnId: { in: personColIds },
      value: { path: ["memberIds"], array_contains: memberId },
    },
    include: { item: { include: { group: true, board: true } } },
  });

  // Skip any cell whose item/group/board is missing (shouldn't happen given the
  // FKs, but guards against orphaned rows) and de-dupe by item id (an item could
  // in principle have more than one person column, both assigned to this member).
  const seen = new Set<string>();
  const matched: { item: NonNullable<(typeof assignedCells)[number]["item"]> }[] = [];
  for (const cell of assignedCells) {
    const item = cell.item;
    if (!item || !item.group || !item.board) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    matched.push({ item });
  }
  if (matched.length === 0) return [];

  // Per distinct board, find its first status column and first date/timeline
  // column (by position) so we can show a representative status + due date.
  const boardIds = Array.from(new Set(matched.map((m) => m.item.boardId)));
  const boardColumns = await prisma.column.findMany({
    where: { boardId: { in: boardIds } },
    orderBy: { position: "asc" },
  });
  const statusColByBoard = new Map<string, (typeof boardColumns)[number]>();
  const dateColByBoard = new Map<string, (typeof boardColumns)[number]>();
  for (const col of boardColumns) {
    if (col.type === "status" && !statusColByBoard.has(col.boardId)) statusColByBoard.set(col.boardId, col);
    if ((col.type === "date" || col.type === "timeline") && !dateColByBoard.has(col.boardId)) {
      dateColByBoard.set(col.boardId, col);
    }
  }

  const itemIds = matched.map((m) => m.item.id);
  const relevantColumnIds = new Set<string>();
  for (const col of statusColByBoard.values()) relevantColumnIds.add(col.id);
  for (const col of dateColByBoard.values()) relevantColumnIds.add(col.id);

  const cells =
    relevantColumnIds.size > 0
      ? await prisma.cellValue.findMany({
          where: { itemId: { in: itemIds }, columnId: { in: Array.from(relevantColumnIds) } },
        })
      : [];
  const cellsByItemAndCol = new Map<string, (typeof cells)[number]>();
  for (const c of cells) cellsByItemAndCol.set(`${c.itemId}:${c.columnId}`, c);

  const rows: PersonActivityRow[] = matched.map(({ item }) => {
    const statusCol = statusColByBoard.get(item.boardId);
    const dateCol = dateColByBoard.get(item.boardId);

    let status: PersonActivityRow["status"] = null;
    if (statusCol) {
      const cell = cellsByItemAndCol.get(`${item.id}:${statusCol.id}`);
      const labelId = (cell?.value as { labelId?: string } | undefined)?.labelId;
      if (labelId) {
        const labels = ((statusCol.settings as { labels?: StatusLabel[] } | null)?.labels ?? []) as StatusLabel[];
        const found = labels.find((l) => l.id === labelId);
        if (found) status = { label: found.label, color: found.color };
      }
    }

    let due: string | null = null;
    if (dateCol) {
      const cell = cellsByItemAndCol.get(`${item.id}:${dateCol.id}`);
      const value = cell?.value as { date?: string; start?: string } | undefined;
      due = value?.date ?? value?.start ?? null;
    }

    return {
      boardId: item.boardId,
      boardName: item.board.name,
      groupId: item.groupId,
      groupName: item.group.name,
      groupColor: item.group.color,
      itemId: item.id,
      itemName: item.name,
      status,
      due,
    };
  });

  rows.sort((a, b) => {
    return (
      a.boardName.localeCompare(b.boardName) ||
      a.groupName.localeCompare(b.groupName) ||
      a.itemName.localeCompare(b.itemName)
    );
  });

  return rows;
}
