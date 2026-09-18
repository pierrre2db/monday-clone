# v1.3 — Users management, filters, admin tier

**Goal:** Better people management: a super-user (admin) tier that gates member management; full member CRUD (edit + delete with clean unassign); board **filters** (by person/status/group) to see who works on what; and a cross-board **"Focus personne / My Work"** view aggregating one person's items across ALL boards (with CSV export).

**Approach (decided):** Étage 1 (filters + person view + member CRUD) + Étage 2(A) lightweight admin: a separate `ADMIN_PASSWORD` unlocks management; no full per-user accounts yet. Members stay assignable labels.

**Stack unchanged:** Next.js 16, React 19, Prisma 7 + Postgres, single instance still gated by `APP_PASSWORD`; `ADMIN_PASSWORD` adds an elevated role in the same session cookie.

**Env:** Docker prod on host 4000 (don't disturb), other app on 3000, Postgres 5432, test on `PORT=3005`. 13 tests must stay green.

---

## Task 1: Admin tier (auth role) + member routes gated + member edit route

**Files:** `src/lib/session.ts`, `src/app/api/auth/route.ts`, new `src/app/api/auth/me/route.ts`, `src/proxy.ts` (allow `/api/auth/me` public? no — needs session), `src/db/members.ts`, `src/app/api/members/route.ts`, `src/app/api/members/[id]/route.ts`, `.env.example`, `docker-compose.yml`.

- [ ] Step 1: `session.ts` — extend the JWT payload with a role. `signSession(secret, admin=false)` embeds `{ ok:true, admin }`. Add `readSession(token, secret): Promise<{ ok:boolean; admin:boolean }>` returning `{ok:false,admin:false}` on failure. Keep `verifySession` (returns boolean) for the proxy, implemented via `readSession`.
- [ ] Step 2: `auth/route.ts` POST — accept `{password}`. Resolve role:
  - if `process.env.ADMIN_PASSWORD` is set AND `password === ADMIN_PASSWORD` → sign session with `admin:true`.
  - else if `password === APP_PASSWORD` → sign with `admin:false` — BUT if `ADMIN_PASSWORD` is unset/empty, grant `admin:true` (backward compat: single-password deployments keep full rights).
  - else 401.
- [ ] Step 3: `src/app/api/auth/me/route.ts` GET — read the session cookie, return `{ authenticated:boolean, admin:boolean }`. (Behind the proxy gate, so unauthenticated → proxy returns 401 anyway; still return shape for the client.)
- [ ] Step 4: server admin guard — add `src/lib/adminGuard.ts`: `async function isAdmin(req: Request): Promise<boolean>` reading the `monday_session` cookie from the `cookie` header and `readSession`. In `members` POST and `members/[id]` DELETE **and** a new PATCH, return 403 unless `isAdmin`.
- [ ] Step 5: member edit + clean-unassign in `db/members.ts`:
  - `updateMember(id, { name?, avatarColor? })`.
  - `deleteMemberAndUnassign(id)`: within a transaction — find all `person` columns, load their CellValues whose `value.memberIds` includes `id`, rewrite each removing `id`, then delete the member.
  - `members/[id]/route.ts` PATCH → `updateMember`; DELETE → `deleteMemberAndUnassign`.
- [ ] Step 6: `.env.example` + `docker-compose.yml` — add `ADMIN_PASSWORD` (compose: `ADMIN_PASSWORD: ${ADMIN_PASSWORD:-}`; empty default = APP_PASSWORD is admin). Document in comments.
- [ ] Step 7: unit test `src/lib/session.test.ts` — extend: signing with admin embeds admin; `readSession` returns the role; wrong secret → `{ok:false,admin:false}`. Keep existing cases green.
- [ ] Verify: tsc/tests/build; curl: login with APP_PASSWORD (admin false when ADMIN set), login with ADMIN_PASSWORD (admin true), `GET /api/auth/me` reflects it, `POST /api/members` as non-admin → 403, as admin → 201. Commit `feat(auth): admin tier + gated member CRUD + member edit/unassign`.

---

## Task 2: Members management UI (admin-gated, edit + delete)

**Files:** `src/ui/board/MembersPanel.tsx`, `src/ui/board/BoardShell.tsx`, `src/ui/board/api.ts`.

- [ ] Step 1: `api.ts` — add `updateMember(id,{name?,avatarColor?})` (PATCH), `getMe()` (GET /api/auth/me). (deleteMember exists.)
- [ ] Step 2: BoardShell — on mount fetch `getMe()` into `admin` state; pass to MembersPanel. Keep member add/delete handlers; add `editMember`.
- [ ] Step 3: MembersPanel — each row: color swatch (editable via `<input type=color>`), name (inline editable), delete `×` — all **only when admin**; non-admin sees a read-only list. Add-member row only for admin. Show a small "Admin" badge / or a hint "connecte-toi avec le mot de passe admin pour gerer" when not admin. Delete asks confirm and notes it will unassign the member everywhere.
- [ ] Verify: as admin, add/edit/delete a member (deleted member disappears from person cells after reload — clean unassign). As non-admin (login with APP_PASSWORD while ADMIN set), management hidden. tsc/tests/build. Commit `feat(ui): admin-gated member management (edit, delete, unassign)`.

---

## Task 3: Board filters (person / status / group)

**Files:** `src/ui/board/FilterBar.tsx` (new), `src/ui/board/BoardShell.tsx`, apply to the views.

- [ ] Step 1: `FilterBar.tsx` — a bar with three popover/multiselect filters: **Personne** (from members), **Statut** (labels of the board's status columns), **Groupe** (board groups). Plus a "Clear" button and a count of active filters. Token-styled, responsive (wraps on mobile).
- [ ] Step 2: BoardShell holds `filters` state `{ memberIds:string[]; labelIds:string[]; groupIds:string[] }` (persist per-board in localStorage, try/catch). Compute `visibleItems` = items passing ALL active filters:
  - member: item has a `person` cell whose `memberIds` intersects `filters.memberIds`.
  - status: item has a `status` cell whose `labelId` ∈ `filters.labelIds`.
  - group: `item.groupId ∈ filters.groupIds`.
  (Empty filter = no constraint.) Pass a filtered `board` (same shape, `items` replaced by `visibleItems`) to Table/Kanban/Calendar so all three respect it. Show "X items masqués par les filtres" hint.
- [ ] Step 3: Render `<FilterBar>` under the toolbar.
- [ ] Verify: filter by a member → only their items across all 3 views; combine with status; clear resets. Persist across reload. 375px OK. tsc/tests/build. Commit `feat(ui): board filters by person/status/group`.

---

## Task 4: "Focus personne / My Work" — cross-board aggregation + CSV

**Files:** new `src/db/people.ts`, new `src/app/api/people/[id]/items/route.ts`, new `src/app/people/page.tsx` (+ client `src/ui/people/PeopleView.tsx`), link from home/board.

- [ ] Step 1: `db/people.ts` — `itemsForMember(memberId)`: across ALL boards, find items assigned to the member. Query `person` columns; for each, find CellValues where `value.memberIds` contains `memberId` (Prisma JSON filter: `value: { path:["memberIds"], array_contains: memberId }`), include `item -> group, board`. For each matched item also gather its status label (first status column on that board) + a date (first date column) for display. Return rows `{ boardId, boardName, groupName, itemId, itemName, status:{label,color}|null, due:string|null }`, sorted by board then group.
- [ ] Step 2: `api/people/[id]/items/route.ts` GET → `itemsForMember(id)` (behind auth; any authenticated user can view — it's read-only).
- [ ] Step 3: `people/page.tsx` (server) lists members; `PeopleView.tsx` (client): a member selector (avatars), then a table of that member's items grouped by board (columns: Board, Groupe, Item, Statut chip, Échéance). A **"Exporter CSV"** button builds a CSV client-side (board,group,item,status,due) and triggers download. Responsive (stacked on mobile). Empty state "Aucune activite".
- [ ] Step 4: Add a "Mon activité / Focus personne" link in the board header/home nav.
- [ ] Verify: assign the seed member to items on 2 boards → the view shows all across boards; status chips render; CSV downloads with the right rows. 375px OK. tsc/tests/build. Commit `feat: cross-board person activity view (My Work) + CSV export`.

---

## Task 5: Docker rebuild + smoke + docs

**Files:** `README.md`, `MANUAL.md`, `.env.example` (done in T1).

- [ ] Step 1: `docker compose up -d --build` (no `-v`), app healthy on :4000.
- [ ] Step 2: Smoke on :4000 — login as admin (ADMIN_PASSWORD if set, else APP_PASSWORD), manage a member, filter a board, open the person view, export CSV. Non-admin login hides management. 375px no overflow.
- [ ] Step 3: Update README + MANUAL: document `ADMIN_PASSWORD`, the admin/super-user concept, filters, and the Focus personne / My Work view. Bump the roadmap (mark filters + admin done; per-user accounts still pending).
- [ ] Step 4: `npm test` green. Commit `docs: document admin tier, filters, person view` + `chore: rebuild v1.3` if any infra change.

---

## Self-Review Notes
- Backward compat: `ADMIN_PASSWORD` unset → `APP_PASSWORD` grants admin, so existing deployments keep working.
- Security: member mutations are gated **server-side** (not just hidden in UI). The admin claim lives in the signed session cookie (can't be forged without SESSION_SECRET).
- The person-activity aggregation and filters read the same `person` cell shape `{memberIds:[]}` used everywhere — no data model change except none (Member model unchanged; no migration needed).
- Out of scope (Étage 2B, later): real per-user login accounts, Viewer role, per-board permissions, deactivate-vs-delete two-step.
