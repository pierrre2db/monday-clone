# MCP server — drive the app from Claude

**Goal:** A standalone MCP server (`mcp/`) that lets Claude drive this Monday-clone via tools
mapped to the app's REST API. Decisions: **(A) standalone** Node/TS server · **auth = login by
creds** (email+password from env, keeps the session cookie) · **role = admin** (full scope) ·
**transport = stdio** (local) · **scope = read + content + structure + users**.

**Reference:** built per the `mcp-builder` skill (TypeScript SDK, `registerTool`, Zod `.strict()`,
annotations, stdio). Server name: `monday-clone-mcp-server`. Lives in `mcp/` (own package, own
`node_modules`, not part of the app build).

**Auth flow:** on first request (and on any 401), POST `${MONDAY_API_URL}/api/auth`
`{email,password}`, capture the `monday_session` cookie from `Set-Cookie`, send it as `Cookie`
on all subsequent requests. The account's role (admin) governs permissions server-side.

**Config (env):** `MONDAY_API_URL` (default `http://localhost:4000`), `MONDAY_EMAIL`,
`MONDAY_PASSWORD`. Fail fast with a clear message if email/password missing.

**HTTP:** native `fetch` (Node 18+), no axios. Shared `apiRequest(path, method, body)` that
injects the cookie, re-logins once on 401, and throws actionable errors. A `CHARACTER_LIMIT`
guard on large outputs.

## Tools (snake_case, `monday_` prefix; annotations set)
Read (readOnlyHint):
- `monday_list_boards` → id+name list.
- `monday_get_board {boardId}` → full board (groups, columns[type,settings], items+cells). This is
  how the agent learns column ids/types and status label ids before writing.
- `monday_list_users` → users (id,name,email,role,active). (No passwordHash — API never returns it.)
- `monday_person_activity {memberId}` → that member's items across ALL boards (`/api/people/[id]/items`).

Content (member+):
- `monday_add_item {boardId, groupId, name}` → created item.
- `monday_set_cell {itemId, columnId, value}` → set a raw typed value (value = the JSON shape for
  that column type; describe the shapes in the tool description).
- `monday_set_status {itemId, columnId, label}` → resolve `label` (name) to its labelId via the
  column settings, then set. Convenience over set_cell.
- `monday_assign_person {itemId, columnId, people}` → resolve names/emails to member ids, set memberIds.
- `monday_set_date {itemId, columnId, date}` → set `{date}` (YYYY-MM-DD or null).
- `monday_rename_item {itemId, name}`, `monday_move_item {itemId, groupId}`.
- `monday_delete_item {itemId}` (destructiveHint).

Structure (admin):
- `monday_create_board {name}`, `monday_add_group {boardId, name}`,
  `monday_add_column {boardId, name, type}` (type ∈ the 11 column types),
  `monday_delete_board {boardId}` (destructiveHint).

Users (admin):
- `monday_create_user {name, email, password, role, avatarColor?}`,
  `monday_update_user {id, name?, email?, role?, active?, password?}`,
  `monday_delete_user {id}` (destructiveHint).

Each tool: Zod `.strict()` input, clear description with value-shape docs + examples, annotations,
try/catch → actionable error text. Return `content` text (+ `structuredContent` for reads).

## Project files (`mcp/`)
```
mcp/
  package.json        # monday-clone-mcp-server, type module, sdk+zod, build/start/dev
  tsconfig.json       # strict, Node16
  README.md           # setup, env, mcp.json snippet, tool list
  .env.example        # MONDAY_API_URL / MONDAY_EMAIL / MONDAY_PASSWORD
  src/
    index.ts          # McpServer + stdio, registers all tools
    client.ts         # login + cookie + apiRequest + resolve helpers
    constants.ts      # CHARACTER_LIMIT, defaults
```

## Tasks
1. Scaffold `mcp/` (package.json, tsconfig, constants) + `client.ts` (login/cookie/apiRequest,
   re-login on 401, helpers `resolveStatusLabelId`, `resolveMemberIds`). Build compiles.
2. Implement all tools in `index.ts` (read → content → structure → users), registerTool + Zod +
   annotations. `npm run build` clean.
3. Smoke test against a running app (:4000) with an admin account: start the server, or drive its
   tools via a tiny harness / MCP Inspector, verifying: list_boards, get_board, add_item,
   set_status (by label name), assign_person (by name), create_user, delete the test artifacts.
   Report real results.
4. Docs: `mcp/README.md` (how to run + `mcp.json`/Claude Desktop/Code config snippet with env),
   add an MCP section to the main `README.md`, note it in `docs/SPECIFICATION.md` + `CHANGELOG.md`,
   check off the item in `TODO.md`. Commit + push.

## Self-review
- Standalone: `mcp/` has its own package.json/node_modules; the app build/tests are untouched.
- Secrets: creds come from env; never logged. Cookie kept in memory only.
- Destructive tools flagged; reads marked readOnly.
- Agent ergonomics: `monday_get_board` first (to learn ids/types), convenience tools resolve
  human names → ids so Claude can act from natural language.
- Out of scope: HTTP transport (stdio only for now), per-user API tokens (login-by-creds now).
