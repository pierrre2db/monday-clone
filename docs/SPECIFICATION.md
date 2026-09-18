# Monday Clone — Living Specification

> **This is the maintained, current-state specification.** Update it whenever behavior,
> data model, or architecture changes. Dated files under `docs/superpowers/specs/` and
> `docs/superpowers/plans/` are immutable historical records of each iteration; this
> document supersedes them. Version history: [`CHANGELOG.md`](../CHANGELOG.md).

**Current version:** v1.3 · **Last updated:** 2026-09-18

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
- **Members**: assignable people for the `person` column (name + color). Admin-gated
  create/edit/delete; deleting a member cleanly unassigns them everywhere.
- **Board filters**: by Person / Status / Group, combinable (AND), applied to all three
  views, persisted per board in the browser.
- **Focus personne / My Work** (`/people`): pick a member → all their items across ALL
  boards (board, group, status, due) + one-click CSV export.
- **Auth**: single shared `APP_PASSWORD` gates the whole instance (signed session cookie).
  Optional `ADMIN_PASSWORD` adds a super-user tier that unlocks member management; empty ⇒
  `APP_PASSWORD` is also admin (backward compatible).
- **File upload/download** on a local disk volume (size-limited, path-traversal guarded).
- **Light/dark theme** (follows system, toggle persists on all pages) and a responsive,
  mobile-first UI (no horizontal overflow at 375px).

## 3. Out of scope / roadmap (not yet built)

- Per-user login accounts, Viewer role, per-board permissions, deactivate-vs-delete two-step
  (the "Étage 2B" full multi-user model).
- Automations ("when status = Done → notify / move").
- Real-time updates (websockets) — currently reload to see others' changes.
- Row/column drag-reorder (drag exists only in Kanban), image avatars, full-text search,
  sub-items, dashboards.

## 4. Architecture

Monolithic **Next.js** (App Router): React front + Route Handlers (API) in one service.

- **Database:** PostgreSQL via **Prisma 7** (driver adapter). `src/db/*` query modules are
  the ONLY code that touches Prisma; API routes and UI call these modules.
- **Auth:** password(s) → signed JWT (HS256) in an httpOnly cookie (`monday_session`),
  carrying an `admin` flag. `src/proxy.ts` (Next 16 renamed `middleware`→`proxy`) gates all
  routes except `/login` and `/api/auth`. Member mutations are additionally gated
  server-side by `src/lib/adminGuard.ts` (`isAdmin`).
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
| `Member` | id, name, avatarColor | referenced by `person` cell values, not an FK |

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

- **Access gate:** `APP_PASSWORD` (required to use anything).
- **Admin tier:** if `ADMIN_PASSWORD` is set, logging in with it grants `admin:true`;
  `APP_PASSWORD` then grants `admin:false` (usage only). If `ADMIN_PASSWORD` is empty,
  `APP_PASSWORD` grants admin (single-password deployments keep full rights).
- **Admin-only actions:** create/edit/delete members (enforced server-side; the UI hides
  the controls for non-admins but the routes return 403 regardless).
- The `admin` flag lives in the signed cookie and cannot be forged without `SESSION_SECRET`.

## 7. API surface (all behind the auth proxy)

- `POST /api/auth` (login, sets role by password), `DELETE /api/auth` (logout),
  `GET /api/auth/me` → `{authenticated, admin}`.
- `GET/POST /api/boards`, `GET/PATCH/DELETE /api/boards/[id]`.
- `POST /api/groups`, `PATCH/DELETE /api/groups/[id]`.
- `POST /api/columns`, `PATCH/DELETE /api/columns/[id]` (PATCH also sets `settings`).
- `POST /api/items`, `PATCH/DELETE /api/items/[id]`.
- `PUT /api/cells` (validated set of a cell value).
- `GET/POST /api/members`, `PATCH/DELETE /api/members/[id]` (mutations admin-only; DELETE unassigns).
- `POST /api/upload` (multipart, size-limited), `GET /api/upload?id=` (download).
- `GET /api/people/[id]/items` (cross-board items for a member).

## 8. Configuration

| Var | Meaning | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | compose default |
| `APP_PASSWORD` | Instance password | `change-me` (change it) |
| `ADMIN_PASSWORD` | Super-user password for member management; empty ⇒ APP_PASSWORD is admin | `""` |
| `SESSION_SECRET` | Cookie signing secret (long random) | generate |
| `UPLOAD_DIR` | File storage path | `/data/uploads` |
| `MAX_UPLOAD_BYTES` | Max upload size | `10485760` |

## 9. Testing

Vitest: column value validators, session (incl. admin role), DB integration (setCell),
one cell-editor component test. Run `npm test` (16 tests as of v1.3). Type check
`npx tsc --noEmit`; build `npm run build`.

## 10. Known limitations

- Single shared password (no individual accounts); no login rate-limiting; password
  comparison is not constant-time — acceptable for a trusted team behind HTTPS.
- Item position uses a count-based scheme (benign race under high concurrency).
- The status/dropdown label editor (⚙) can be visually clipped inside the table's
  horizontal-scroll container in edge cases (functional, cosmetic).

## 11. Maintaining this document

When you ship a change that alters behavior, data model, API, or config:
1. Update the relevant section(s) here and bump **Current version / Last updated**.
2. Add an entry to [`CHANGELOG.md`](../CHANGELOG.md).
3. Keep the dated plan/spec under `docs/superpowers/` as the immutable record of that work;
   do not edit past ones — supersede them here instead.
