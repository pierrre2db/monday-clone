# Changelog

All notable changes to this project. See [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md)
for the current-state specification and [`docs/superpowers/`](docs/superpowers/) for the
per-iteration design docs and plans.

## v1.3.1 — Fix (2026-09-18)
- **Fix**: the status/dropdown label editor (⚙) is now a centered modal (closes on Escape
  and backdrop click) instead of an absolutely-positioned panel that could be clipped by the
  table's scroll container.

## v1.3 — Users, filters & admin tier (2026-09-18)
- **Admin tier**: optional `ADMIN_PASSWORD` unlocks member management; empty ⇒ `APP_PASSWORD`
  is admin (backward compatible). `GET /api/auth/me` exposes `{authenticated, admin}`.
- **Member management**: admin-gated create/edit (name, color)/delete; deleting a member
  cleanly unassigns them from every `person` cell. Gating enforced server-side (403).
- **Board filters**: by Person / Status / Group, combinable (AND), applied to all three
  views, persisted per board in the browser.
- **Focus personne / My Work** (`/people`): cross-board aggregation of one member's items
  with CSV export.
- **Fix**: saved theme now applies on all pages, not just the board.
- Plan: `docs/superpowers/plans/2026-09-18-users-filters-admin.md`.

## v1.2 — UI redesign (2026-09-17)
- Design tokens + Inter font + **light/dark** (follows system, toggle persists).
- Reusable UI kit (`src/ui/kit/`): Button, StatusChip, Avatar/AvatarStack, Pill, Popover,
  ThemeToggle.
- Cell editors restyled: **status chips** + popover, **avatar assignees** + popover,
  dropdown pills — replacing native `<select multiple>`.
- **Responsive**: Table → stacked cards on mobile (sticky first column on desktop);
  Kanban → horizontal snap scroll; Calendar → agenda list on mobile.
- Shell/home/login restyle. Approved mockup: `docs/superpowers/specs/board-redesign-mockup.html`.
- Plan: `docs/superpowers/plans/2026-09-17-monday-redesign.md`.

## v1.1 — UI CRUD polish (2026-09-17)
- Delete/rename items, columns, groups from the UI; create/delete boards from home.
- Editable status/dropdown labels (⚙). Members management panel (add/list/delete).
- New route: `DELETE /api/members/[id]`.
- Plan: `docs/superpowers/plans/2026-09-17-monday-polish.md`.

## v1.0 — Initial release (2026-09-17)
- Boards → groups → items → 11 typed column types.
- Table / Kanban / Calendar views.
- Single-password auth (signed session cookie), file upload on a local volume.
- PostgreSQL + Prisma, Docker Compose deployment (app + db), demo seed.
- Design: `docs/superpowers/specs/2026-09-17-monday-clone-design.md`;
  plan: `docs/superpowers/plans/2026-09-17-monday-clone.md`.
