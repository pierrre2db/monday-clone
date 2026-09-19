# Phase 2B — Per-user accounts + roles

**Goal:** Replace the single shared password with real per-user accounts (email + password) and
three global roles — **Admin** (super-user), **Member**, **Viewer** — with server-enforced
permissions. The super-user manages users, assigns roles, defines statuses + structure; Members
edit item content; Viewers read only.

**Key design decisions (approved):**
- The account entity is the existing **`Member`** Prisma model, *extended* with account fields
  (`email`, `passwordHash`, `role`, `active`). This avoids a risky rename/data migration; the UI
  and docs call them **users**. The person cell value keeps its `{ memberIds: string[] }` shape
  (ids now point to accounts) — no churn in validators/PersonCell/filters/people.
- Roles are **global** (not per-board). Per-board permissions = future.
- **No public signup.** Admins create accounts. First admin is **bootstrapped from env**
  (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) when no users exist.
- **`APP_PASSWORD` is removed.** `ADMIN_PASSWORD` (v1.3 tier) is removed too (superseded by roles).
- Demo data is **re-seeded** clean with an admin + sample users.

**Password hashing:** `node:crypto` **scrypt** (salt + hash, `timingSafeEqual`). No new dependency.

**Permissions matrix (server-enforced on every mutating route):**
| Area | Viewer | Member | Admin |
| --- | --- | --- | --- |
| Read (GET boards/board/people/users/me, download files) | ✅ | ✅ | ✅ |
| Item content: `PUT /api/cells`, items POST/PATCH/DELETE, upload POST | ❌ | ✅ | ✅ |
| Structure: boards, groups, columns POST/PATCH/DELETE | ❌ | ❌ | ✅ |
| Status/dropdown label definitions (column `settings`) | ❌ | ❌ | ✅ |
| User management: users POST/PATCH/DELETE | ❌ | ❌ | ✅ |

Env: Docker prod host 4000 (don't disturb), other app 3000, Postgres 5432. Test on `PORT=3005`.
Tests must stay green (16 today; add auth/password/role tests).

---

## Task 1: Data model, password hashing, user query module, bootstrap, seed

**Files:** `prisma/schema.prisma`, new `src/lib/password.ts`, `src/db/members.ts` (extend), new
`scripts/bootstrap-admin.mjs`, `prisma/seed.ts`, `.env.example`, `docker-compose.yml`, `Dockerfile`.

- [ ] Step 1 — `schema.prisma`: extend `Member`:
  ```prisma
  model Member {
    id           String   @id @default(cuid())
    name         String
    email        String   @unique
    passwordHash String
    role         String   @default("member") // "admin" | "member" | "viewer"
    active       Boolean  @default(true)
    avatarColor  String   @default("#00c875")
    createdAt    DateTime @default(now())
  }
  ```
  Create the migration (local demo data is disposable — `prisma migrate dev` may reset; that's fine,
  the seed rebuilds it). NOTE for existing deployments: fresh deploys migrate from empty; the demo
  instance is reset.
- [ ] Step 2 — `src/lib/password.ts` (pure, unit-testable):
  ```ts
  import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
  export function hashPassword(pw: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(pw, salt, 64);
    return `${salt.toString("hex")}:${hash.toString("hex")}`;
  }
  export function verifyPassword(pw: string, stored: string): boolean {
    const [s, h] = stored.split(":");
    if (!s || !h) return false;
    const hash = Buffer.from(h, "hex");
    const test = scryptSync(pw, Buffer.from(s, "hex"), 64);
    return hash.length === test.length && timingSafeEqual(hash, test);
  }
  ```
  Test `src/lib/password.test.ts`: hash≠plaintext, verify true for right pw, false for wrong, false for malformed.
- [ ] Step 3 — `src/db/members.ts`: add account-aware functions (keep `listMembers` returning safe
  fields — never expose `passwordHash`):
  - `listMembers()` → all members without `passwordHash` (select id,name,email,role,active,avatarColor).
  - `getMemberByEmail(email)` → full row (incl. hash) for login; returns null if not found.
  - `getMemberById(id)` → safe fields.
  - `createMember({name,email,password,role,avatarColor})` → hash pw, insert. Throw on duplicate email.
  - `updateMember(id,{name?,role?,active?,avatarColor?,password?})` → if password given, re-hash.
  - `deleteMemberAndUnassign(id)` → keep the existing unassign-from-person-cells transaction, then delete.
  - `countMembers()`.
- [ ] Step 4 — `scripts/bootstrap-admin.mjs`: if `countMembers()===0` and `ADMIN_EMAIL`+`ADMIN_PASSWORD`
  set, create an admin (role "admin"). Idempotent (no-op if any user exists). Loads env (dotenv).
  Prints what it did. (Standalone tsx/node script using the Prisma adapter like `seed.ts`.)
- [ ] Step 5 — `prisma/seed.ts`: create an **admin** (`admin@example.com` / `ADMIN_PASSWORD` env or a
  default like `admin`), a **member** (Alice, role member), a **viewer** (Bob, role viewer) — with
  hashed passwords — then the demo board assigning Alice/Bob to items as before. Print the admin email.
- [ ] Step 6 — env/infra:
  - `.env.example`: remove `APP_PASSWORD`, `ADMIN_PASSWORD`; add `ADMIN_EMAIL="admin@example.com"` and
    `ADMIN_PASSWORD="change-me-admin"` (used only for bootstrap/seed), keep `SESSION_SECRET`,
    `DATABASE_URL`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`.
  - `docker-compose.yml`: replace `APP_PASSWORD`/`ADMIN_PASSWORD` env with `ADMIN_EMAIL`/`ADMIN_PASSWORD`
    (bootstrap only).
  - `Dockerfile` CMD: `npx prisma migrate deploy && node scripts/bootstrap-admin.mjs && npm run start`
    (bootstrap the first admin on container start).
- [ ] Verify: migration applies, `npm run db:seed` seeds admin+alice+bob+board, `npm test` incl. new
  password tests. Commit `feat(auth): user accounts model, scrypt hashing, bootstrap + seed`.

---

## Task 2: Auth — email/password login, session with role, remove single-password gate

**Files:** `src/lib/session.ts`, `src/app/api/auth/route.ts`, `src/app/api/auth/me/route.ts`,
`src/lib/adminGuard.ts` → generalize to `src/lib/authz.ts`, `src/proxy.ts`, `src/app/login/page.tsx`,
`src/lib/session.test.ts`.

- [ ] Step 1 — `session.ts`: `signSession(secret, {uid, role})` embeds `{uid, role}`; `readSession(token,
  secret)` → `{ ok, uid, role }` (`ok:false` on failure). Keep `verifySession` as `(await readSession).ok`.
  Update `session.test.ts` for uid+role round-trip.
- [ ] Step 2 — `src/lib/authz.ts` (replaces adminGuard): 
  - `getSession(req): Promise<{uid,role}|null>` (parse cookie, readSession).
  - `requireAuth(req)`, `requireMember(req)` (role ∈ {admin,member}), `requireAdmin(req)` — each returns
    the session or null; routes translate null → 401/403. Provide a small helper
    `forbidden()`/`unauthorized()` returning NextResponse.
- [ ] Step 3 — `auth/route.ts` POST `{email,password}`: `getMemberByEmail`; if found, `active`, and
  `verifyPassword` → `signSession(secret,{uid:member.id, role:member.role})`, set cookie. Else 401
  (generic "email ou mot de passe invalide"; don't reveal which). Remove all `APP_PASSWORD`/`ADMIN_PASSWORD`
  logic. Keep DELETE (logout).
- [ ] Step 4 — `auth/me/route.ts`: return `{ authenticated, user: {id,name,email,role} | null }` from the
  session (look up `getMemberById`).
- [ ] Step 5 — `proxy.ts`: unchanged behavior (gate all except `/login`, `/api/auth`, static) — it uses
  `verifySession`, still valid.
- [ ] Step 6 — `login/page.tsx`: email + password fields; POST to `/api/auth`; on success `router.push("/")`;
  show generic error on 401. Token-styled card (as today).
- [ ] Verify (real): `PORT=3005 npm run dev`. curl: login with the seeded admin → 200 + cookie, `/api/auth/me`
  shows role admin; wrong password → 401; inactive user → 401. Browser: login page works. tsc/tests/build.
  Commit `feat(auth): email/password login with roles; remove shared password`.

---

## Task 3: Server-side permission enforcement on all routes

**Files:** all route handlers under `src/app/api/*` (boards, groups, columns, items, cells, upload,
members→users, people).

- [ ] Step 1 — apply the matrix using `authz.ts` helpers. For each mutating handler, add the guard at the
  top returning 401 (no session) or 403 (wrong role):
  - `cells` PUT, `items` POST/PATCH/DELETE, `upload` POST → `requireMember`.
  - `boards`/`groups`/`columns` POST/PATCH/DELETE → `requireAdmin`. (Columns PATCH already special-cased
    settings→admin; now the whole column mutation set is admin, so simplify to requireAdmin for the route.)
  - `members` (users) POST/PATCH/DELETE → `requireAdmin`; GET → `requireAuth`.
  - GET routes (boards, board/[id] is a page not API, people, upload GET, auth/me) → `requireAuth`
    (the proxy already blocks anonymous; add explicit `requireAuth` where a handler mutates or exposes data).
- [ ] Step 2 — rename the `/api/members` route folder stays `/api/members` (path unchanged to avoid client
  churn); it now manages accounts. `createMember` requires `{name,email,password,role}`; validate email
  present + role ∈ {admin,member,viewer}; 400 otherwise.
- [ ] Verify (real): with seeded admin/alice(member)/bob(viewer), curl each role's cookie against a
  representative route: viewer PUT /api/cells → 403; member PUT /api/cells → 200; member POST /api/columns
  → 403; admin POST /api/columns → 201; viewer/member POST /api/members → 403; admin → 201. Report the
  real codes. tsc/tests/build. Commit `feat(authz): enforce role permissions on all routes`.

---

## Task 4: Role-aware UI (login state, users admin panel, hide/disable by role)

**Files:** `src/ui/board/BoardShell.tsx`, `TableView.tsx`, `KanbanView.tsx`, `CalendarView.tsx`,
`ItemDetailPanel.tsx`, `Toolbar.tsx`, `MembersPanel.tsx`→users admin, `FilterBar.tsx` (stays),
`src/ui/home/HomeBoards.tsx`, `src/app/page.tsx`, `src/ui/board/api.ts`, a small top-bar showing the
logged-in user + logout.

- [ ] Step 1 — `api.ts`: `getMe()` now returns `{authenticated, user:{id,name,email,role}}`. Add
  `logout()` (DELETE /api/auth). Users CRUD helpers gain `email,password,role,active` fields.
- [ ] Step 2 — `BoardShell`: fetch `me` → derive `role`; compute `canEditContent = role!=="viewer"`,
  `isAdmin = role==="admin"`. Pass these into the views + panels. Add a small header element showing the
  user's name + a **Logout** button (calls `logout()` → `/login`). Keep `ThemeToggle`.
- [ ] Step 3 — gating rules in UI (server already enforces; this is UX):
  - **Viewer** (`!canEditContent`): render cells/tickets **read-only** — swap editors for display
    (StatusChip/AvatarStack/Pill/plain text; date as text; no popovers/inputs). Hide +Add item, ⤢ still
    opens the ticket but read-only, hide all ×/rename/⚙/+Group/+Column/Members/board create+delete.
  - **Member** (`canEditContent && !isAdmin`): content editable (cells, items add/rename/delete, ticket
    edit). Hide admin-only: ⚙ (status defs), +Column/+Group and column/group rename+delete, board
    create+delete, the Users admin panel's create/edit/delete (show read-only user list for assignment).
  - **Admin**: everything (as today).
  Implement read-only cell rendering via a `readOnly` prop threaded to the cell render helper (both Table
  and ItemDetailPanel) that renders display components instead of editors.
- [ ] Step 4 — `MembersPanel` → **Users admin panel**: admin can create a user (name, email, password,
  role select, color), edit (name, role, active, color, optional new password), delete. Non-admin: simple
  read-only list (names + roles) for context. Show role badges.
- [ ] Step 5 — `HomeBoards`/`page.tsx`: create/delete board only for admin; everyone sees the list; add a
  logout + user indicator on the home header too.
- [ ] Verify (real, all three roles): log in as admin/alice/bob in turn (browser), confirm the UI matches
  the matrix (viewer fully read-only, member edits content but no structure/⚙/user-mgmt, admin full).
  375px + light/dark. tsc/tests/build. Commit `feat(ui): role-aware UI + users admin panel + login/logout`.

---

## Task 5: Docker rebuild + smoke (3 roles) + docs + push

- [ ] Rebuild `docker compose up -d --build` (bootstrap creates admin from env; reseed demo). Smoke on
  :4000: log in as admin (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`), create a member + a viewer, log in as each,
  verify permissions end-to-end (viewer read-only, member content-only, admin full). 375px.
- [ ] Docs: rewrite the auth/roles parts of `docs/SPECIFICATION.md` (§2 scope, §6 auth & roles, §7 API,
  §8 config — new env, remove APP_PASSWORD), `MANUAL.md` (§3 config, §4 connexion by email, §6 rôles: the
  3 roles + who can do what + creating users + bootstrap), `README.md` (features + config + first-run
  admin), `CHANGELOG.md` (v2.0). Bump SPEC to **v2.0**. Note per-board permissions still future.
- [ ] `npm test` green. Commit `docs: document accounts + roles (v2.0)`; push all Phase-2B commits.

---

## Self-Review Notes
- Passwords: hashed with scrypt, never returned by any API (`listMembers`/`getMemberById` exclude
  `passwordHash`); login errors are generic (no user enumeration); `timingSafeEqual` for comparison.
- Enforcement is **server-side** per the matrix; UI gating is UX only.
- No public signup; first admin via env bootstrap; `APP_PASSWORD` fully removed.
- Person cell shape unchanged (`memberIds`) → validators/filters/people view keep working.
- Deferred: per-board permissions, invite emails, password reset flow, self-service profile.
