# Monday Clone v1.1 — Polish UX Implementation Plan

> **For agentic workers:** implement task-by-task, TDD where noted, commit per task.

**Goal:** Fill the UI CRUD gaps of v1: delete/rename items, columns, groups, boards; create board; edit status/dropdown labels; manage members.

**Architecture:** Same stack (Next.js 16 App Router, Prisma 7, Postgres). Most DELETE/PATCH API routes already exist (Task 6 of v1). New backend: `DELETE /api/members/[id]`. Everything else is client wiring in `src/ui/board/*` and the home page, plus new `api.ts` helpers. All mutations go through existing `src/db/*` modules.

**Test target:** iterate with `npm run dev` (spare port, e.g. `PORT=3005`) against the running Postgres (localhost:5432, `.env` DATABASE_URL). Do NOT disturb the Docker container on host port 4000 or the user's app on 3000. After all tasks, rebuild the Docker image once and confirm on :4000.

---

## Task 1: Backend gaps + client api helpers

**Files:**
- Create: `src/app/api/members/[id]/route.ts`
- Modify: `src/db/members.ts` (add `deleteMember`)
- Modify: `src/db/boards.ts` (already has createBoard/deleteBoard/renameBoard — verify)
- Modify: `src/ui/board/api.ts` (add helpers)

- [ ] Step 1: `src/db/members.ts` — add:
```typescript
export const deleteMember = (id: string) => prisma.member.delete({ where: { id } });
```

- [ ] Step 2: `src/app/api/members/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { deleteMember } from "@/db/members";
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteMember(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] Step 3: extend `src/ui/board/api.ts` with (keep existing helpers):
```typescript
  deleteItem: (id: string) => fetch(`/api/items/${id}`, { method: "DELETE" }).then(json),
  renameItem: (id: string, name: string) =>
    fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).then(json),
  deleteColumn: (id: string) => fetch(`/api/columns/${id}`, { method: "DELETE" }).then(json),
  updateColumn: (id: string, data: object) =>
    fetch(`/api/columns/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }).then(json),
  deleteGroup: (id: string) => fetch(`/api/groups/${id}`, { method: "DELETE" }).then(json),
  updateGroup: (id: string, data: object) =>
    fetch(`/api/groups/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }).then(json),
```

- [ ] Step 4: `npx tsc --noEmit` clean; commit `feat: member delete route + client CRUD helpers`.

---

## Task 2: Table view CRUD (delete/rename item, column header menu, group actions)

**Files:**
- Modify: `src/ui/board/BoardShell.tsx` (handlers + pass down)
- Modify: `src/ui/board/TableView.tsx` (UI controls)

- [ ] Step 1: In `BoardShell`, add handlers (optimistic where cheap):
  - `deleteItem(id)` → `api.deleteItem(id)`, remove from `board.items`.
  - `renameItem(id, name)` → `api.renameItem`, update item name in state.
  - `deleteColumn(id)` → confirm, `api.deleteColumn`, remove column + its cells from state.
  - `renameColumn(id, name)` → `api.updateColumn(id,{name})`, update state.
  - `deleteGroup(id)` → confirm, `api.deleteGroup`, remove group + its items from state.
  - `renameGroup(id, name)` → `api.updateGroup(id,{name})`, update state.
  Pass these to TableView via props.

- [ ] Step 2: In `TableView`:
  - Group title: inline-editable name (double-click or an edit input) + a `× delete group` button (with confirm).
  - Column header: name editable + a small `×` to delete the column (confirm).
  - Item row: first cell shows an editable name input (rename on blur) + a `×` to delete the row.

- [ ] Step 3: Verify against `npm run dev` (spare port): create a scratch board via UI, add group/columns/items, rename each, delete each, confirm state + reload persistence. `npm test` still passes. Commit `feat: table CRUD — rename/delete items, columns, groups`.

---

## Task 3: Home — create + delete board

**Files:**
- Create: `src/ui/home/HomeBoards.tsx` (client)
- Modify: `src/app/page.tsx` to render it

- [ ] Step 1: `HomeBoards.tsx` (client): renders the list, a "+ New board" input+button (POST /api/boards then navigate to `/board/<id>`), and a `×` delete per board (confirm, DELETE /api/boards/<id>, refresh list).

- [ ] Step 2: `src/app/page.tsx` passes the server-fetched boards to `<HomeBoards initial={boards} />`.

- [ ] Step 3: Verify: create a board from home → redirected to it; delete a board → gone. `npm run build` OK. Commit `feat: create/delete boards from home`.

---

## Task 4: Status / dropdown label editor

**Files:**
- Create: `src/ui/board/ColumnSettings.tsx` (client)
- Modify: `src/ui/board/TableView.tsx` (open settings from column header for status/dropdown types)

- [ ] Step 1: `ColumnSettings.tsx`: for a `status` column, list `settings.labels` (id/label/color), allow editing label text + color, add a new label (generate id), remove a label; for `dropdown`, same over `settings.options` (id/label). On save, `api.updateColumn(id, { settings })` and update board state.
- [ ] Step 2: Wire a "⚙" button on status/dropdown column headers to toggle the editor (inline panel or simple prompt-based fallback is acceptable if a panel is heavy — but prefer an inline panel).
- [ ] Step 3: Verify: edit a status label text/color → Table + Kanban reflect it; add a label → appears in the status dropdown and as a Kanban lane. Commit `feat: edit status/dropdown labels`.

---

## Task 5: Members management

**Files:**
- Create: `src/ui/board/MembersPanel.tsx` (client)
- Modify: `src/ui/board/BoardShell.tsx` (toggle panel; pass members state)

- [ ] Step 1: `MembersPanel.tsx`: list members (name + color swatch), add member (POST /api/members), delete member (DELETE /api/members/<id>). Keep members in BoardShell state so the Person column editor sees updates without reload.
- [ ] Step 2: A "Members" button in the board toolbar toggles the panel.
- [ ] Step 3: Verify: add a member → appears in Person column options; delete a member. Commit `feat: members management panel`.

---

## Task 6: Rebuild Docker image + smoke

- [ ] Step 1: `docker compose up -d --build` (rebuilds app image with new code), confirm app healthy on :4000.
- [ ] Step 2: Authed smoke: create board, add/rename/delete a column and item, edit a status label, add a member — via the running container. `npm test` on host passes.
- [ ] Step 3: Commit `chore: rebuild image with v1.1 polish` (if any Dockerfile/compose change; else note no change needed).

---

## Self-Review Notes
- All 8 scoped polish items map to Tasks 2–5; backend gap (member delete) in Task 1.
- Deletes that cascade (column→cells, group→items, board→all) rely on Prisma `onDelete: Cascade` from the v1 schema — state updates must mirror the cascade locally.
- Out of scope (unchanged): drag-reorder rows/columns, image avatars, undo.
