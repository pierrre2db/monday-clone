# Documentation

How the project's docs are organized and which one to trust.

## Read these first (living, kept current)
- **[SPECIFICATION.md](SPECIFICATION.md)** — the current-state specification: scope,
  architecture, data model, auth/roles, API surface, config, limitations. **This is the
  source of truth.** Update it with every behavior/model/API change.
- **[../CHANGELOG.md](../CHANGELOG.md)** — version history (v1.0 → v1.3), newest first.
- **[../MANUAL.md](../MANUAL.md)** — end-user & admin manual (install, usage, backups,
  VPS deployment, troubleshooting).
- **[../README.md](../README.md)** — project overview & quick start.

## Historical records (immutable — do not edit)
Each iteration was designed and planned before implementation. These snapshots capture the
intent at the time and are kept for traceability; they are **not** updated as the app evolves
(the living SPECIFICATION.md supersedes them).

- `superpowers/specs/2026-09-17-monday-clone-design.md` — v1 design (superseded)
- `superpowers/specs/board-redesign-mockup.html` — v1.2 approved UI mockup
- `superpowers/plans/2026-09-17-monday-clone.md` — v1 implementation plan
- `superpowers/plans/2026-09-17-monday-polish.md` — v1.1 UI CRUD
- `superpowers/plans/2026-09-17-monday-redesign.md` — v1.2 redesign
- `superpowers/plans/2026-09-18-users-filters-admin.md` — v1.3 users/filters/admin

## Workflow for a change
1. (Optional) Write a dated plan under `superpowers/plans/` for a non-trivial iteration.
2. Implement + test.
3. **Update `SPECIFICATION.md`** (bump version/date) and add a **`CHANGELOG.md`** entry.
4. Update `MANUAL.md`/`README.md` if user-facing.
Leave past dated docs untouched — supersede, don't rewrite history.
