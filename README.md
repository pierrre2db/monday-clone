# Monday Clone

A self-hosted, Docker-deployable work-management app inspired by Monday.com — boards with
typed columns and **Table / Kanban / Calendar** views. Runs on a VPS or locally with one command.

> One shared password gates the whole instance (no per-user accounts yet). Ideal for a
> trusted team behind HTTPS. See the [roadmap](#roadmap).

## Screenshots

| Table view | Kanban board |
| --- | --- |
| ![Table view](docs/screenshots/table.png) | ![Kanban board](docs/screenshots/kanban.png) |
| **Calendar** | **Focus personne (cross-board My Work)** |
| ![Calendar view](docs/screenshots/calendar.png) | ![Person activity view](docs/screenshots/people.png) |

Dark mode and mobile (the table becomes stacked cards):

| Dark theme | Mobile |
| --- | --- |
| ![Dark theme](docs/screenshots/table-dark.png) | ![Mobile stacked cards](docs/screenshots/mobile.png) |

<sub>Regenerate with the app running: `npm i -D playwright && npx playwright install chromium && node scripts/screenshots.mjs`.</sub>

## Features

- **Boards** → groups → items → **typed columns**: text, status, person, date, number,
  dropdown/priority, checkbox, timeline, files, link, tags
- **Three views** over the same data: editable **Table** (sticky first column), drag-and-drop
  **Kanban** (drag a card to change its status), and **Calendar** (by date/timeline column)
- **Board filters** by Person / Status / Group, combinable, applied across all three views
- **Focus personne (cross-board My Work view + CSV export)** — pick a member at `/people` to
  see all their items across every board, with a one-click CSV export
- **Colored status chips**, **avatar assignees**, editable status/dropdown labels
- **File uploads** stored on a local volume
- **Members** management for the person column, gated behind the **admin tier**
- **Two-tier auth**: `APP_PASSWORD` for usage, optional separate `ADMIN_PASSWORD` for member
  management (signed session cookie carries the admin flag)
- **Light / dark theme** (follows system, toggle persists) and a **responsive** UI —
  the table becomes stacked cards on mobile, no horizontal overflow
- Full CRUD from the UI: create/rename/delete boards, groups, columns, items

## Quick start (Docker)

```bash
git clone <this-repo-url> monday-clone
cd monday-clone
cp .env.example .env          # then edit .env — set APP_PASSWORD and SESSION_SECRET
docker compose up -d --build
docker compose exec app npm run db:seed   # optional: demo board
```

Open **http://localhost:3000** and sign in with `APP_PASSWORD`.

> Port 3000 already taken? In `docker-compose.yml` (service `app`) change `"3000:3000"` to
> `"4000:3000"`, then `docker compose up -d`. App is then on http://localhost:4000.

## Configuration

| Var | Meaning | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://monday:monday@db:5432/monday?schema=public` |
| `APP_PASSWORD` | Single shared instance password | `change-me` — **change it** |
| `ADMIN_PASSWORD` | Separate super-user password unlocking member management; empty means `APP_PASSWORD` is also admin | `""` |
| `SESSION_SECRET` | Cookie signing secret (long random) | generate one |
| `UPLOAD_DIR` | File storage path | `/data/uploads` |
| `MAX_UPLOAD_BYTES` | Max upload size (bytes) | `10485760` (10 MB) |

Generate a secret: `openssl rand -base64 32`.
**Before exposing publicly**, change `APP_PASSWORD` and set a real `SESSION_SECRET`, and put
an HTTPS reverse proxy in front (see the manual).

## Documentation

- **[User & admin manual (MANUAL.md)](MANUAL.md)** — full guide: usage, configuration,
  backups, updates, VPS deployment, troubleshooting, architecture.
- **[Specification (docs/SPECIFICATION.md)](docs/SPECIFICATION.md)** — current-state spec:
  scope, architecture, data model, auth/roles, API surface. The source of truth.
- **[Changelog (CHANGELOG.md)](CHANGELOG.md)** — version history (v1.0 → v1.3).
- **[docs/](docs/README.md)** — how the documentation base is organized (living docs vs
  historical iteration records).

## Local development

```bash
docker compose up -d db          # just PostgreSQL
cp .env.example .env             # point DATABASE_URL at localhost:5432
npx prisma migrate deploy
npm install
npm run db:seed
npm run dev                      # http://localhost:3000
```

Tests: `npm test` · Types: `npx tsc --noEmit` · Build: `npm run build`.

## Tech stack

Next.js (App Router) · React · TypeScript · Prisma · PostgreSQL · Docker Compose.
Cell values are stored as JSON, validated per column type. See MANUAL.md § Architecture.

## Data & backups

Data lives in Docker volumes `pgdata` (database) and `uploads` (files). `docker compose down`
keeps them; `down -v` deletes them. Backup commands are in the manual.

## Roadmap

Done: board filters, admin tier, cross-board person activity view. Pending: per-user accounts
+ roles, automations, real-time (websockets), row/column drag-reorder, image avatars, full-text
search. Contributions welcome.

## License

[MIT](LICENSE) © Pierre De Dobbeleer
