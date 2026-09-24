# Changelog

All notable changes to this project. See [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md)
for the current-state specification and [`docs/superpowers/`](docs/superpowers/) for the
per-iteration design docs and plans.

## v2.2 — Time tracking + app settings (2026-09-24)
- **Time tracking**: log time on a task (`TimeEntry` per task/day/person) from the ticket panel —
  minutes + date + note, running total, delete your own. Member+ logs their own time; Viewer read-only.
- **App settings** (admin `/settings`, key/value `Setting` table): a **daily-hours check** (enable +
  target hours/day) driving an in-app banner « Aujourd'hui : Xh / Nh », and **SMTP** config with a
  write-only password (never returned by any API — only `passSet`).
- New API: `/api/time*`, `/api/settings` + `/api/settings/public`.

## v2.1 — MCP server (2026-09-20)
- **Standalone MCP server** (`mcp/`, `monday-clone-mcp-server`) so Claude can drive the app via
  tools mapped to the REST API: read boards/users/person-activity; add/edit/move/delete items;
  set status (by label name), assignee (by person name), dates; create boards/groups/columns;
  manage users. Auth = logs in with a configured account (role governs permissions); stdio
  transport; destructive tools flagged. Not part of the app build (own package). See `mcp/README.md`.

## v2.0.1 — User edit form (2026-09-19)
- Admin can now edit an existing user's **email** and **password** (plus name, role, active,
  color) via an edit form (click ✎ on a user; blank password = unchanged). Email changes are
  uniqueness-checked (400 on duplicate). Fixes the previous gap where only name/role/active/color
  were editable.

## v2.0 — Per-user accounts + roles (2026-09-19)
- **Per-user accounts**: real email/password login replaces the single shared `APP_PASSWORD`
  (now removed). Passwords hashed with `node:crypto` scrypt (salted, `timingSafeEqual`
  comparison); never returned by any API.
- **Three global roles** — **Admin**, **Member**, **Viewer** — with a server-enforced
  permission matrix on every mutating route (401 unauthenticated, 403 wrong role): Viewer is
  read-only, Member edits item content (cells, items, uploads), Admin additionally controls
  structure (boards/groups/columns), status/dropdown label definitions, and user management.
- **Users admin panel**: admins create/edit (role, password, active)/delete accounts from the
  board's Users panel; non-admins see a read-only list. Deleting a user cleanly unassigns them
  from every `person` cell, as before.
- **Login/logout + role-aware UI**: email/password login page, logout button, a user/role
  indicator in the header; cells and controls render read-only for Viewers and hide
  admin-only actions for Members.
- **Bootstrap admin**: the first admin account is created automatically on container start
  from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (`scripts/bootstrap-admin.mjs`, run before `npm run
  start` in the Dockerfile) — a no-op once any account exists.
- Session cookie now carries `{uid, role}` (was a single `admin` boolean); `GET /api/auth/me`
  returns `{authenticated, user:{id,name,email,role}}`.
- Removed dead `src/lib/adminGuard.ts` (superseded by `src/lib/authz.ts` in this release).
- Plan: `docs/superpowers/plans/2026-09-19-phase-2b-accounts-roles.md`.

## v1.4 — Editable ticket panel + status-definition lock (2026-09-18)
- **Item detail panel (ticket)**: open an item from any view (⤢ in Table/Kanban, click a chip
  in Calendar) → edit every field (name, status, assignee, dates, all types) in one side drawer,
  or delete it. Full-screen on mobile.
- **Status definitions locked to admin**: only the super-user can redefine status/dropdown
  labels (the ⚙ editor / any column `settings` change; 403 for non-admins). Regular users still
  set a cell's status, just can't redefine the labels. (Structural edits stay open for now.)
- **Fix**: suppress the theme hydration warning; set the real page title/description.

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
