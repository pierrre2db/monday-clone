# v1.4 — Editable ticket panel + status-definition lock

**Goal:** (1) An editable **item detail panel** ("ticket") openable from all three views, where every
field of an item can be edited (name, status, person/assignee, dates, all column types) and the item
deleted. (2) **Lock status/dropdown label definitions to admin** — only the super-user defines the
project's statuses; regular users use them but cannot redefine them.

**Not in this iteration:** per-user login accounts + per-person role assignment (Admin/Member/Viewer) =
"Étage 2B", a separate later chantier. Structural edits (add/delete columns, groups, boards) stay open
to all authenticated users for now (only status *definitions* are locked).

**Stack unchanged.** Env: Docker prod on host 4000, other app on 3000, Postgres 5432, `APP_PASSWORD=change-me`.
Test on `PORT=3005`. 16 tests must stay green.

Current context:
- `BoardShell.tsx` (client) holds `board`, `members`, `admin` (from `GET /api/auth/me`), `filters`, and
  handlers `saveCell`, `addItem`, `renameItem`, `deleteItem`, `renameColumn`, `deleteColumn`,
  `deleteGroup`, `renameGroup`, `updateColumnSettings`, `addMember`, `editMember`, `deleteMember`.
  It derives `filteredBoard` and passes a `shared` object to `TableView`/`KanbanView`/`CalendarView`.
- Cell editors: `cellRegistry[col.type].Editor` with props `{ column, members, value, onChange }`.
- `ColumnSettings.tsx` = the ⚙ status/dropdown label editor (now a centered modal). Opened from a ⚙
  button in `TableView` column headers; saves via `updateColumnSettings(colId, settings)` →
  `api.updateColumn(colId, { settings })` → `PATCH /api/columns/[id]`.
- Admin: `src/lib/adminGuard.ts` `isAdmin(req)`; member routes already gated.

---

## Task A: Editable item detail panel (ticket)

**Files:** new `src/ui/board/ItemDetailPanel.tsx`; modify `BoardShell.tsx`, `TableView.tsx`,
`KanbanView.tsx`, `CalendarView.tsx`.

- [ ] Step 1 — `ItemDetailPanel.tsx` (`"use client"`): props
  `{ item: Item; board: BoardFull; members: Member[]; onClose: () => void;
     saveCell:(itemId,colId,value)=>void; renameItem:(id,name)=>void; deleteItem:(id)=>void }`.
  Render a **modal/side panel** (fixed overlay + backdrop, close on Escape + backdrop click — reuse the
  pattern from `ColumnSettings.tsx`). Contents:
  - Header: the item name as an editable input (blur → `renameItem(item.id, name)`), the group name as
    a small colored badge, and a close ×.
  - Body: one row per `board.columns` — the column name label + `cellRegistry[col.type].Editor` with
    `value = item.cells.find(c=>c.columnId===col.id)?.value ?? {}` and
    `onChange = (v)=>saveCell(item.id, col.id, v)`. This makes every field editable, including
    **assignee** (person column) and status.
  - Footer: a **Delete** button (kit `Button` danger) → `window.confirm` → `deleteItem(item.id)` then
    `onClose()`.
  - Responsive: panel is a right-side drawer on desktop (e.g. width 420, full height) and full-screen on
    mobile; no horizontal overflow at 375px.
- [ ] Step 2 — `BoardShell.tsx`: add `openItemId` state + `onOpenItem(id)` handler. Render
  `<ItemDetailPanel item={board.items.find(i=>i.id===openItemId)!} ... />` when `openItemId` is set and
  the item still exists (guard against deletion). Pass `onOpenItem` into the `shared` props. Reuse
  existing `saveCell`/`renameItem`/`deleteItem`; on delete, also clear `openItemId`.
  IMPORTANT: pass the panel the item from the REAL `board` (not `filteredBoard`) so it stays open even if
  a filter would hide it.
- [ ] Step 3 — open triggers in each view (all call `onOpenItem(item.id)`):
  - `TableView`: add a small "⤢"/"open" button (title "Ouvrir la fiche") in each item row (desktop) and
    each mobile card header. Keep the existing inline name-rename + × delete.
  - `KanbanView`: clicking a card opens the panel. Distinguish click from drag: use dnd-kit's drag state
    — only open on a click that did not move (e.g. compare pointer down/up, or use `useDraggable`'s
    `isDragging`/a small movement threshold; simplest: an explicit small "open" button on the card, OR
    onClick guarded by "was not dragging"). Prefer an explicit open affordance on the card to avoid
    drag/click conflicts.
  - `CalendarView`: clicking an item chip opens the panel.
- [ ] Verify (real): `PORT=3005 npm run dev`, seed board. From Table, Kanban, and Calendar, open a
  ticket → edit its name, change status via popover, change assignee, set a date — all persist (reload /
  GET). Delete from the panel works and closes it. 375px: panel is full-screen, no overflow. Light+dark.
  tsc/tests/build green. Revert seed edits. Commit `feat(ui): editable item detail panel (ticket) from all views`.

---

## Task B: Lock status/dropdown label definitions to admin

**Files:** `src/app/api/columns/[id]/route.ts`, `src/ui/board/TableView.tsx`, `src/ui/board/BoardShell.tsx`.

- [ ] Step 1 — server: in `PATCH /api/columns/[id]`, if the request body contains a `settings` key,
  require admin: `if ("settings" in body && !(await isAdmin(req))) return 403 {error:"admin required"}`.
  Renaming a column (`{name}`) stays allowed for any authenticated user (structure not locked this
  iteration). (Import `isAdmin` from `@/lib/adminGuard`.)
- [ ] Step 2 — client: pass `admin` from `BoardShell` into `TableView`. In `TableView`, render the ⚙
  (Column settings) button **only when `admin`**. Non-admins still see status chips and can set a
  cell's status value (that's `PUT /api/cells`, not a settings change) — they just can't redefine the
  labels.
- [ ] Step 3 — Verify: with `ADMIN_PASSWORD` set, non-admin login → no ⚙ on status/dropdown headers; a
  direct `PATCH /api/columns/[id] {settings:...}` returns 403; setting a cell's status still works.
  Admin login → ⚙ present, settings save works. Backward compat (ADMIN_PASSWORD empty) → ⚙ shown (all
  admin). tsc/tests/build green. Commit `feat(auth): lock status/dropdown label definitions to admin`.

---

## Task C: Rebuild + docs

- [ ] `docker compose up -d --build` (no `-v`), smoke on :4000: open a ticket from each view + edit;
  confirm ⚙ gating with `ADMIN_PASSWORD`. 375px OK.
- [ ] Docs: update `docs/SPECIFICATION.md` (features: item detail panel; note status definitions are
  admin-only; bump version) + `CHANGELOG.md` (v1.4) + `MANUAL.md` (§5: how to open/edit a ticket; §6:
  statuses defined by admin only). `npm test` 16 green.
- [ ] Commit docs; push all v1.4 commits to origin.

---

## Self-Review Notes
- Ticket panel reuses `cellRegistry` editors + existing handlers → no new value logic, tests stay valid.
- Status-definition lock is enforced **server-side** (settings PATCH → 403), UI hiding is secondary.
- Kanban open trigger must not fight drag — prefer an explicit affordance over card-wide onClick.
- Deferred to 2B: per-user accounts, per-person roles, locking structural edits (columns/groups/boards).
