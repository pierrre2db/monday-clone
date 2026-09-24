# Phase 3A+3B — Time tracking + app settings

**Goal:** (3A) Log time worked on tasks (a `TimeEntry` per task/day/person) with a UI in the item
ticket panel and a personal daily/weekly total. (3B) An admin **Settings** page backed by a
key/value `Setting` table holding a **daily-hours-check** option (enabled + target hours/day) and
**SMTP** config (write-only password), plus an in-app **daily-hours banner** that verifies the
logged-in user's hours-today against the target.

**Decisions (approved):** TimeEntry table (not a simple column) · `Setting` key/value table ·
SMTP password write-only/masked (never returned to the client) · target hours **global** (per-user
later) · order 3A+3B now, email reminders (3C) + scheduler later.

**Stack unchanged.** Roles: Viewer read-only; Member logs their OWN time; Admin edits settings +
sees everything. Env: Docker prod host 4000, other app 3000, Postgres 5432, test on `PORT=3005`.

**Permissions**
| Action | Viewer | Member | Admin |
| --- | --- | --- | --- |
| Read time entries, read daily-check target | ✅ | ✅ | ✅ |
| Log/delete own time | ❌ | ✅ | ✅ |
| Read/write app settings (incl. SMTP) | ❌ | ❌ | ✅ |

---

## Task 1: Data model + query modules + API (time + settings)

**Files:** `prisma/schema.prisma`, new `src/db/time.ts`, `src/db/settings.ts`, new API routes,
`prisma/seed.ts` (optional seed setting), tests.

- [ ] Step 1 — Prisma models:
  ```prisma
  model TimeEntry {
    id        String   @id @default(cuid())
    itemId    String
    memberId  String
    minutes   Int
    date      String   // "YYYY-MM-DD"
    note      String   @default("")
    createdAt DateTime @default(now())
    item      Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
    member    Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
    @@index([itemId]) @@index([memberId]) @@index([date])
  }
  model Setting {
    key   String @id
    value Json
  }
  ```
  Add the back-relations on `Item` (`timeEntries TimeEntry[]`) and `Member` (`timeEntries TimeEntry[]`).
  Migrate (`prisma migrate dev --name time_settings`).
- [ ] Step 2 — `src/db/time.ts`:
  - `addTime({itemId, memberId, minutes, date, note})` — validate `minutes` 1..1440 (24h) and `date` ISO `YYYY-MM-DD`, else throw.
  - `listItemTime(itemId)` — entries for an item, include member name (join), newest first.
  - `listMemberTime(memberId, from, to)` — entries for a member in [from,to] date range.
  - `deleteTime(id)`, `getTimeEntry(id)` (to check ownership).
  - `itemTimeTotal(itemId)` / totals helpers as needed.
- [ ] Step 3 — `src/db/settings.ts`:
  - `getSetting(key)` / `getAllSettings()` (returns a `{dailyCheck, smtp}` object with sane defaults:
    `dailyCheck = {enabled:false, targetHours:8}`, `smtp = {host:"",port:587,user:"",from:"",secure:false}` — password stored separately in the row's value but NEVER surfaced by the read helpers used for the client).
  - `setSetting(key, value)` (upsert). For `smtp`: a `setSmtp(partial)` that preserves the existing
    password when the incoming `pass` is empty/undefined (write-only). A `getSmtpSafe()` that returns
    smtp WITHOUT `pass`, plus `passSet: boolean`.
  - `getDailyCheck()` → `{enabled, targetHours}` (safe to expose to any authenticated user).
- [ ] Step 4 — API routes (use `src/lib/authz.ts` guards):
  - `POST /api/time` `{itemId, minutes, date?, note?}` — **requireMember**; `memberId = session.uid`
    (log YOUR OWN time; ignore any memberId in body); `date` defaults to today (server date). Return the entry.
  - `GET /api/time?itemId=<id>` — requireAuth → `listItemTime`.
  - `GET /api/time/mine?from=&to=` — requireAuth → `listMemberTime(session.uid, from, to)`; also usable
    with just `date` for today's total.
  - `DELETE /api/time/[id]` — requireMember; allow if the entry's `memberId === session.uid` OR admin, else 403.
  - `GET /api/settings/public` — requireAuth → `{dailyCheck}` only (safe; the banner needs the target).
  - `GET /api/settings` — requireAdmin → `{dailyCheck, smtp: getSmtpSafe()}` (no password; `passSet`).
  - `PUT /api/settings` — requireAdmin → accepts `{dailyCheck?, smtp?}`; SMTP password only updated when a
    non-empty `pass` is provided (preserve otherwise). Validate targetHours 0..24, port int.
- [ ] Step 5 — tests: `src/db/time.test.ts` (integration) — add entries, sum, range query, minutes/date
  validation rejects bad input. Keep existing suite green.
- [ ] Verify: tsc/tests/build; curl per role (member logs time 201; viewer 403; admin PUT settings 200;
  member GET /api/settings 403 but GET /api/settings/public 200; smtp password never in any response).
  Commit `feat(time+settings): TimeEntry + Setting models, query modules, API`.

---

## Task 2: Time UI in the ticket panel + personal totals

**Files:** `src/ui/board/ItemDetailPanel.tsx`, `src/ui/board/api.ts`, maybe a small `TimeSection` component.

- [ ] Step 1 — `api.ts`: `addTime(itemId,{minutes,date?,note?})`, `listItemTime(itemId)`, `deleteTime(id)`,
  `myTime({from,to})`.
- [ ] Step 2 — ItemDetailPanel: a **« Temps »** section (below the fields):
  - Total logged (sum of minutes → shown as `Xh YYmin`).
  - List of entries: date · member name · duration · note · a `×` (delete) shown only for the current
    user's own entries (or admin).
  - A quick-log form (member+ only): minutes input (or hours+min), date (default today), optional note →
    `addTime`. Viewer sees the list read-only, no form.
  - Refresh the list/total after add/delete. Format minutes as `Xh YYmin` via a shared helper.
- [ ] Verify: open a ticket as member → log 90 min today + 30 min → total 2h; delete one; viewer sees
  read-only list, no form; persists on reload. tsc/tests/build. Commit `feat(ui): log time on a task (ticket panel)`.

---

## Task 3: Settings page (admin) + daily-hours banner

**Files:** new `src/app/settings/page.tsx` + `src/ui/settings/SettingsView.tsx`, new
`src/ui/board/DailyHoursBanner.tsx`, wire into BoardShell/home, `src/ui/board/api.ts`.

- [ ] Step 1 — `api.ts`: `getSettings()` (admin full), `getPublicSettings()` (dailyCheck), `updateSettings(data)`.
- [ ] Step 2 — `/settings` page (server, admin-guard via getSession → redirect/notFound for non-admin) →
  `SettingsView` (client):
  - **Suivi du temps** block: toggle « Vérifier les heures par jour », number input « Objectif (heures/jour) ».
  - **Email (SMTP)** block: host, port, user, password (`type=password`, placeholder « •••• (inchangé) » with
    a `passSet` hint), expéditeur (from), TLS checkbox. Save → `updateSettings`; password only sent when typed.
  - Token-styled, responsive. A link to `/settings` in the board/home header (admin only).
- [ ] Step 3 — `DailyHoursBanner`: if `getPublicSettings().dailyCheck.enabled` AND the user can log time
  (member/admin), fetch today's total via `myTime({from:today,to:today})`, show
  « Aujourd'hui : Xh YY / Zh » with a subtle warning style when under target and a « Logger du temps » hint.
  Mount it at the top of the board (and/or home). Hidden for viewers and when the option is off.
- [ ] Verify: as admin enable daily check + set target 8h, set SMTP (password saved, never returned);
  as member the banner shows today's total vs 8h and warns when under; non-admin cannot open `/settings`
  (redirect) and `PUT /api/settings` → 403. 375px + dark. tsc/tests/build.
  Commit `feat(ui): admin settings page + daily-hours banner`.

---

## Task 4: Docker rebuild + smoke + docs + push

- [ ] Rebuild `docker compose up -d --build` (no `-v`). Smoke on :4000: member logs time on a task;
  admin sets daily-check + SMTP; member sees the banner; SMTP password never leaks (check GET responses).
- [ ] Docs: `docs/SPECIFICATION.md` (data model: TimeEntry, Setting; features: time logging, settings,
  daily-hours check; API additions; bump version), `CHANGELOG.md`, `MANUAL.md` (log time on a task; admin
  Settings page — daily hours + SMTP), `TODO.md` (check off; leave 3C email reminders + scheduler + per-user
  targets + reporting page + MCP `log_time`). `npm test` green. Commit + push.

---

## Self-Review
- SMTP password is write-only end to end: stored in the `Setting` row, never returned by any API
  (`getSmtpSafe` strips it; only `passSet` boolean is exposed). Settings write is admin-only, server-enforced.
- Time is logged as the SESSION user (`memberId = session.uid`), never trusting a client-supplied id.
- Daily-check target is readable by members (needed for the banner) via a separate `/api/settings/public`
  that exposes only `dailyCheck` — SMTP stays admin-only.
- Deferred (3C+): email reminders + scheduler (cron/endpoint), per-user targets, a full time-reporting page
  with CSV, and an MCP `monday_log_time` tool.
