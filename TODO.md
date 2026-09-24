# TODO / Backlog

Living backlog. Done items move to [`CHANGELOG.md`](CHANGELOG.md); the current state is in
[`docs/SPECIFICATION.md`](docs/SPECIFICATION.md).

## Testing
- [x] **End-to-end UI test script** — `e2e/smoke.mjs` drives the app in a headless browser
      (Playwright) and asserts role-based behavior (login, admin/member/viewer controls,
      read-only viewer) + self-provisions and cleans up its test users. Run: `npm run e2e`
      (app must be running; `npm i -D playwright && npx playwright install chromium` first).
- [ ] Extend `e2e/smoke.mjs`: assert a cell edit persists after reload; open a ticket (⤢) and
      edit a field; edit a user's email/password via the ✎ form; drag a Kanban card (needs a
      real drag gesture).
- [ ] Wire `npm run e2e` into CI (start app + DB, seed, run e2e, tear down).

## MCP (drive from Claude)
- [x] **Standalone MCP server** (`mcp/`) — 18 tools over the REST API (boards/items/cells/users/
      person-activity), login-by-creds (admin), stdio. Run per `mcp/README.md`.
- [ ] Optional: HTTP/SSE transport (drive a remote VPS), per-user API tokens instead of creds,
      an MCP eval suite.

## Time tracking & settings
- [x] **Time tracking** (3A) — log time per task (`TimeEntry`), ticket-panel UI, personal total.
- [x] **App settings** (3B) — admin `/settings`: daily-hours check (+ in-app banner) and SMTP config
      (write-only password).
- [ ] **3C — email reminders**: daily « log your time / under target » email using the SMTP settings +
      a scheduler (node-cron in the app, or a protected `/api/cron/...` endpoint hit by an external cron).
- [ ] Time **reporting page** (per person / task / board / period) + CSV export.
- [ ] Per-user daily-hours target (currently global).
- [ ] MCP tool `monday_log_time` (log/report time from Claude).

## Next iteration (requested)
- [ ] **Email notification on account create/change** — send the user an email when their
      account is created or modified. Uses the SMTP settings (3B); needs templates + async send.

## Roles & accounts (Phase 2C)
- [ ] Per-board permissions (roles are currently global).
- [ ] Self-service: change my own password / profile.
- [ ] Password reset flow (token by email) + login rate-limiting.
- [ ] Invite-by-email (create account → send set-password link instead of a plaintext password).

## Features
- [ ] Automations ("when status = Done → notify / move").
- [ ] Real-time updates (websockets) so collaborators see changes without reload.
- [ ] Drag-reorder rows and columns (drag currently only in Kanban).
- [ ] Image avatars (currently initials + color).
- [ ] Full-text search / saved filters, sub-items, dashboards.

## Polish / debt
- [ ] Screenshots in README are static — regenerate after UI changes (`node scripts/screenshots.mjs`).
- [ ] Consider hashing passwords with an async KDF / argon2 if traffic grows (currently sync scrypt).
- [ ] Before public VPS: change `ADMIN_PASSWORD`, change the admin password in-app, real
      `SESSION_SECRET`, HTTPS reverse proxy.
