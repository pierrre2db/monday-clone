# Monday.com Clone — v1 Design

> ⚠️ **Historical snapshot (v1, 2026-09-17).** This is the original design as first shipped.
> The app has since evolved (v1.1 UI CRUD, v1.2 redesign, v1.3 admin tier + filters + person
> view). For the **current, maintained specification** see [`docs/SPECIFICATION.md`](../../SPECIFICATION.md);
> for the version history see [`CHANGELOG.md`](../../../CHANGELOG.md). Kept here as a record of intent.

**Date:** 2026-09-17
**Status:** Superseded — see the living specification.

## Goal

Self-hosted work-management app (Monday.com-style) deployable as a Docker image on a
VPS **or** run locally on macOS. v1 focuses on the core board experience with multiple
views. No per-user accounts yet (single shared password gate); real auth deferred to v2.

## Scope

### In scope (v1)
- Boards with groups, items (rows), and typed columns
- Column types: `text`, `status`, `person`, `date`, `number`, `dropdown`/`priority`,
  `checkbox`, `timeline`, `files`, `link`, `tags`
- Three views over the same data: **Table**, **Kanban**, **Calendar**
- Members list (name + avatar color) used by the `person` column — no login per member
- Single shared password protecting the whole instance
- File upload/download (local disk volume)
- Docker Compose deployment (app + Postgres), same setup for VPS and macOS

### Out of scope (v2+)
- Per-user accounts, signup, roles/permissions
- Automations ("when status = Done → notify X")
- Real-time websockets (v1 uses polling / Next.js revalidation)
- Dashboards, Gantt/timeline chart view, integrations, mobile app

## Architecture

Monolithic **Next.js** (App Router) app: React frontend + Route Handlers (API) +
Server Actions. Single app container.

- **Database:** PostgreSQL via **Prisma** ORM. Separate `db` container.
- **Auth:** single password from env `APP_PASSWORD`. `/login` page sets a signed,
  httpOnly session cookie. Middleware gates all routes except `/login` and static assets.
- **File storage:** local disk mounted as a Docker volume (`UPLOAD_DIR`, default
  `/data/uploads`). Files served through an authenticated API route. Enforced max upload size.
- **Deployment:** `docker-compose.yml` with `app` + `db`, named volumes for Postgres data
  and uploads. `docker compose up -d` on VPS or macOS. Local dev alternative:
  `npm run dev` against a local/Docker Postgres.
- **Real-time:** v1 relies on polling / Next.js revalidation. No websockets (YAGNI).

## Data model (Prisma)

| Entity | Fields |
| --- | --- |
| `Board` | id, name, description, createdAt |
| `Group` | id, boardId, name, color, position |
| `Column` | id, boardId, name, type, settings (JSON), position |
| `Item` | id, boardId, groupId, name, position, createdAt |
| `CellValue` | id, itemId, columnId, value (JSON) — unique on (itemId, columnId) |
| `Member` | id, name, avatarColor |

- `settings` JSON holds per-type config (e.g. status labels + colors, dropdown options).
- `value` JSON is flexible per column type. A small per-type validator normalizes and
  validates values on write.
- Cascade deletes: deleting a Board removes its Groups, Columns, Items, CellValues.
  Deleting a Column removes its CellValues. Deleting an Item removes its CellValues.

### Column type value shapes (JSON)
- `text`: `{ "text": string }`
- `status` / `priority`: `{ "labelId": string }` (labels defined in column settings)
- `dropdown`: `{ "optionIds": string[] }`
- `person`: `{ "memberIds": string[] }`
- `date`: `{ "date": "YYYY-MM-DD" | null }`
- `timeline`: `{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } | null`
- `number`: `{ "number": number | null }`
- `checkbox`: `{ "checked": boolean }`
- `files`: `{ "files": [{ "id": string, "name": string, "size": number }] }`
- `link`: `{ "url": string, "label": string }`
- `tags`: `{ "tags": string[] }`

## Views

- **Table (default):** editable grid. Groups as collapsible sections, items as rows,
  columns as headers. Inline cell editing per type. Drag to reorder rows within/between
  groups and to reorder groups.
- **Kanban:** columns = labels of a chosen `status` column. Items are cards; drag a card
  between lanes updates its status value.
- **Calendar:** month grid. Items placed by a chosen `date` or `timeline` column.
  Timeline items span their start→end range.
- **View switcher** at the top of each board. Selected view + view config (e.g. which
  status column drives Kanban) persisted per board.

## Units (isolated, testable)

- `db/` — Prisma schema + one query module per entity (`boards`, `groups`, `columns`,
  `items`, `cells`, `members`). Consumers use these modules, never Prisma directly.
- `lib/columns/` — per-type value validators + default settings. Pure functions, unit-tested.
- `app/api/` — route handlers: boards, groups, columns, items, cells, upload, auth.
- `ui/board/` — `BoardShell` + `ViewSwitcher`; `TableView`, `KanbanView`, `CalendarView`;
  cell renderers + editors keyed by column type.
- `auth/` — middleware + `/login` page + session cookie helpers.

Each unit has a single purpose and a defined interface. Cell renderers/editors are looked
up by column type from a registry, so adding a type touches the registry + validator only.

## Error handling

- Cell writes validated against the column type; invalid values rejected with a clear
  message (400).
- Optimistic UI updates with rollback on API error.
- Upload: reject over-size / disallowed files before writing to disk.
- API returns typed error responses; UI surfaces them as inline toasts.

## Testing

- Unit: column value validators (all types), query modules against a test DB.
- Integration: key API routes (create board, add item, set cell value, upload file, auth gate).
- Manual smoke: run `docker compose up`, create a board, switch all three views.

## Deployment

```bash
docker compose up -d
```

Environment variables:
- `DATABASE_URL` — Postgres connection string
- `APP_PASSWORD` — single shared instance password
- `UPLOAD_DIR` — file storage path (default `/data/uploads`)
- `SESSION_SECRET` — signing key for the session cookie

macOS local: same compose file, or `npm run dev` with a local Postgres and a `.env`.

## Build order (proposed)

1. Project scaffold + Docker Compose + Prisma schema + password auth gate
2. Boards/groups/columns/items CRUD API + query modules + validators
3. Table view (renderers + editors for all column types)
4. File upload column + storage volume
5. Kanban view
6. Calendar view
7. Demo seed script + tests + deployment docs
