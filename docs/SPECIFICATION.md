# Monday Clone — Living Specification

> **This is the maintained, current-state specification.** Update it whenever behavior,
> data model, or architecture changes. Dated files under `docs/superpowers/specs/` and
> `docs/superpowers/plans/` are immutable historical records of each iteration; this
> document supersedes them. Version history: [`CHANGELOG.md`](../CHANGELOG.md).

**Current version:** v2.0 · **Last updated:** 2026-09-19

---

## 1. Goal

Self-hosted, Docker-deployable work-management app (Monday.com-style): boards with typed
columns and Table / Kanban / Calendar views. Runs on a VPS or locally (macOS/Linux/Windows)
via a single `docker compose up`. Designed for a trusted team behind HTTPS.

## 2. Current scope (implemented)

- **Boards** → groups → items → typed columns; full CRUD from the UI (create/rename/delete
  boards, groups, columns, items).
- **11 column types:** text, status, person, date, number, dropdown/priority, checkbox,
  timeline, files, link, tags. Status/dropdown labels are editable (⚙).
- **Three views** over the same data: **Table** (editable grid, sticky first column,
  stacked cards on mobile), **Kanban** (drag a card to change status, horizontal snap),
  **Calendar** (month grid; agenda list on mobile).
- **Item detail panel (ticket)**: open an item from any view (⤢ in Table/Kanban, click a
  chip in Calendar) to edit all its fields — name, status, assignee, dates, every column
  type — in one side drawer, or delete it. Full-screen on mobile.
- **Members**: assignable people for the `person` column (name + color) — the same entity as
  user accounts (see below); deleting one cleanly unassigns them everywhere.
- **Board filters**: by Person / Status / Group, combinable (AND), applied to all three
  views, persisted per board in the browser.
- **Focus personne / My Work** (`/people`): pick a member → all their items across ALL
  boards (board, group, status, due) + one-click CSV export.
- **Per-user accounts (email + password) with roles**: real login accounts (no shared
  password) with three global roles — **Admin**, **Member**, **Viewer**. Login/logout,
  server-enforced permissions per the matrix in §6, and an admin-only user management panel.
- **File upload/download** on a local disk volume (size-limited, path-traversal guarded).
- **Light/dark theme** (follows system, toggle persists on all pages) and a responsive,
  mobile-first UI (no horizontal overflow at 375px).

## 3. Out of scope / roadmap (not yet built)

- Per-board permissions (roles are global, see §6); invite-by-email; self-service password
  reset/profile editing.
- **Email notification on account creation/change** (send the user an email when their account
  is created or modified) — requires SMTP config; planned next iteration.
- Automations ("when status = Done → notify / move").
- Real-time updates (websockets) — currently reload to see others' changes.
- Row/column drag-reorder (drag exists only in Kanban), image avatars, full-text search,
  sub-items, dashboards.

## 4. Architecture

Monolithic **Next.js** (App Router): React front + Route Handlers (API) in one service.

- **Database:** PostgreSQL via **Prisma 7** (driver adapter). `src/db/*` query modules are
  the ONLY code that touches Prisma; API routes and UI call these modules.
- **Auth:** email + scrypt-hashed password → signed JWT (HS256) in an httpOnly cookie
  (`monday_session`), carrying `{uid, role}`. `src/proxy.ts` (Next 16 renamed
  `middleware`→`proxy`) gates all routes except `/login` and `/api/auth`. Every mutating route
  is additionally gated server-side by role via `src/lib/authz.ts` (`requireAuth`/
  `requireMember`/`requireAdmin`), per the matrix in §6.
- **Cell values:** stored as JSON in `CellValue.value`, validated/normalized per column
  type by pure functions in `src/lib/columns/` (the single source of truth for value shapes).
- **Files:** local disk mounted as a Docker volume (`UPLOAD_DIR`), served via an
  authenticated route with a path-traversal guard and `MAX_UPLOAD_BYTES` limit.
- **UI:** design tokens + light/dark in `src/app/globals.css`; reusable primitives in
  `src/ui/kit/` (Button, Chip, Avatar, Pill, Popover, ThemeToggle); board UI in
  `src/ui/board/`; people view in `src/ui/people/`. Inline styles + token classes, no Tailwind.
- **Deployment:** multi-stage Dockerfile + `docker-compose.yml` (app + db + named volumes
  `pgdata`/`uploads`). `prisma migrate deploy` runs on container start.

## 5. Data model (Prisma)

| Entity | Fields | Notes |
| --- | --- | --- |
| `Board` | id, name, description, createdAt | |
| `Group` | id, boardId→Board, name, color, position | cascade delete from Board |
| `Column` | id, boardId→Board, name, type, settings(JSON), position | `settings` holds status labels / dropdown options |
| `Item` | id, boardId→Board, groupId→Group, name, position, createdAt | |
| `CellValue` | id, itemId→Item, columnId→Column, value(JSON) | unique (itemId, columnId) |
| `Member` | id, name, email(unique), passwordHash, role, active, avatarColor, createdAt | account + assignable person; referenced by `person` cell values, not an FK; `passwordHash` never returned by any API |

Cascade deletes: Board → its Groups/Columns/Items/CellValues; Column → its CellValues;
Item → its CellValues. Member deletion is handled in application code (unassign from all
`person` cells, then delete).

### Cell value shapes (JSON), by column type
`text {text}` · `number {number|null}` · `checkbox {checked}` · `status {labelId|null}` ·
`dropdown {optionIds[]}` · `person {memberIds[]}` · `date {date|null}` ·
`timeline {start,end}|{start:null,end:null}` · `files {files:[{id,name,size}]}` ·
`link {url,label}` · `tags {tags[]}`.
Settings: `status {labels:[{id,label,color}]}` · `dropdown {options:[{id,label}]}`.

## 6. Auth & roles

- **Accounts:** real per-user login — email + password, no shared instance password. Password
  hashing is `node:crypto` **scrypt** (random 16-byte salt, 64-byte derived key, stored as
  `salt:hash` hex, compared with `timingSafeEqual`) — no extra dependency, never returns
  `passwordHash` from any API, and login failures are a generic "invalid email or password"
  (no user enumeration).
- **Session:** on successful login, `signSession(secret, {uid, role})` sets the signed httpOnly
  cookie; `src/proxy.ts` still just checks the cookie is valid (gates all routes except
  `/login`/`/api/auth`), and each route additionally checks `role` via `src/lib/authz.ts`.
- **Three global roles** (not per-board — see §3 roadmap):
  - **Viewer** — read-only: can log in, view all boards/items/files/the user list, use
    filters and Focus personne, but cannot change anything.
  - **Member** — Viewer rights **plus** item content: edit cells (`PUT /api/cells`),
    create/edit/delete items, upload files.
  - **Admin** — Member rights **plus** structure (create/edit/delete boards, groups, columns),
    status/dropdown label definitions (column `settings`), and user management (create/edit/
    delete accounts, assign roles).

  | Area | Viewer | Member | Admin |
  | --- | --- | --- | --- |
  | Read (boards, items, people, users, file download) | ✅ | ✅ | ✅ |
  | Item content: cells, items CRUD, file upload | ❌ | ✅ | ✅ |
  | Structure: boards/groups/columns CRUD | ❌ | ❌ | ✅ |
  | Status/dropdown label definitions | ❌ | ❌ | ✅ |
  | User management (create/edit/delete accounts) | ❌ | ❌ | ✅ |

  Enforced server-side on every mutating route (401 unauthenticated, 403 wrong role); the UI
  additionally hides/disables controls a role can't use (read-only cell rendering for
  Viewer, admin-only buttons hidden for Member/Viewer) — but the server check is what actually
  protects the data.
- **No public signup.** Accounts are created by an admin from the Users panel. The **first**
  admin is bootstrapped on container start from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  (`scripts/bootstrap-admin.mjs`, run by the Dockerfile `CMD` before `npm run start`) — a no-op
  once any account already exists, so it's safe to leave those env vars set permanently.
- `APP_PASSWORD` (the v1.x single shared password) is **removed**; there is no instance-wide
  password anymore, only individual accounts.

## 7. API surface (all behind the auth proxy)

- `POST /api/auth` `{email,password}` → looks up the account, verifies the password, sets the
  session cookie; `DELETE /api/auth` (logout); `GET /api/auth/me` →
  `{authenticated, user:{id,name,email,role} | null}`.
- `GET/POST /api/boards`, `GET/PATCH/DELETE /api/boards/[id]` (mutations admin-only).
- `POST /api/groups`, `PATCH/DELETE /api/groups/[id]` (admin-only).
- `POST /api/columns`, `PATCH/DELETE /api/columns/[id]` (admin-only; PATCH also sets `settings`).
- `POST /api/items`, `PATCH/DELETE /api/items/[id]` (member+).
- `PUT /api/cells` (member+; validated set of a cell value).
- `GET/POST /api/members`, `PATCH/DELETE /api/members/[id]` — user accounts (the endpoint path
  is unchanged from v1.x to avoid client churn, but it now manages login accounts, not just
  assignable people). GET requires any authenticated session; POST/PATCH/DELETE are admin-only.
  `POST`/`PATCH` accept `{name,email,password,role,active,avatarColor}` (role ∈
  admin/member/viewer); DELETE unassigns the user from every `person` cell first.
- `POST /api/upload` (member+, multipart, size-limited), `GET /api/upload?id=` (any
  authenticated session, download).
- `GET /api/people/[id]/items` (cross-board items for a member; any authenticated session).

## 8. Configuration

| Var | Meaning | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | compose default |
| `ADMIN_EMAIL` | Email for the bootstrapped first admin account (bootstrap/seed only; no effect once any account exists) | `admin@example.com` |
| `ADMIN_PASSWORD` | Password for the bootstrapped first admin account (bootstrap/seed only) | `change-me-admin` (change it) |
| `SESSION_SECRET` | Cookie signing secret (long random) | generate |
| `UPLOAD_DIR` | File storage path | `/data/uploads` |
| `MAX_UPLOAD_BYTES` | Max upload size | `10485760` |

`APP_PASSWORD` (v1.x) is removed — there is no instance-wide password.

## 9. Testing

Vitest: column value validators, session (uid+role round-trip), password hashing
(scrypt hash≠plaintext, verify true/false, malformed input), DB integration (setCell),
one cell-editor component test. Run `npm test` (20 tests as of v2.0). Type check
`npx tsc --noEmit`; build `npm run build`.

## 10. Known limitations

- Roles are **global**, not per-board (any Member/Admin can act on every board); per-board
  permissions are future work.
- No password-reset flow and no invite-by-email — an admin sets a user's initial password
  directly in the Users panel; the user can't self-serve a change yet.
- No login rate-limiting.
- Item position uses a count-based scheme (benign race under high concurrency).

## 11. Maintaining this document

When you ship a change that alters behavior, data model, API, or config:
1. Update the relevant section(s) here and bump **Current version / Last updated**.
2. Add an entry to [`CHANGELOG.md`](../CHANGELOG.md).
3. Keep the dated plan/spec under `docs/superpowers/` as the immutable record of that work;
   do not edit past ones — supersede them here instead.
