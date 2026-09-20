# monday-clone-mcp-server

A standalone MCP (Model Context Protocol) server that lets Claude drive the
Monday.com-clone app in this repo through its REST API — listing/creating
boards, items and users, setting cell values, and resolving human-friendly
names (status labels, member names/emails) to the ids the API expects.

This is its own package (own `node_modules`, own build) and is **not** part
of the Next.js app's build or runtime. It talks to the already-running app
over HTTP; it does not import any app code or touch the database directly.

## How it works

- Authenticates against `POST /api/auth` with an email/password from the
  environment and keeps the resulting `monday_session` cookie in memory for
  the life of the process.
- On a `401` response it re-authenticates once and retries the request.
- All HTTP + cookie + name-resolution logic lives in `src/client.ts`; tools
  in `src/index.ts` only translate MCP calls into calls on that client.

## Requirements

- Node.js >= 18 (for native `fetch`).
- The Monday-clone app running and reachable (by default at
  `http://localhost:4000`, i.e. the app's Docker container).
- A valid login for that app. Admin-only tools (board/column/group/user
  management) need an account with the `admin` role.

## Environment variables

| Variable          | Required | Default                 | Description                                   |
|-------------------|----------|--------------------------|------------------------------------------------|
| `MONDAY_API_URL`  | no       | `http://localhost:4000` | Base URL of the running app.                  |
| `MONDAY_EMAIL`    | yes      | —                        | Login email for the account the server uses.  |
| `MONDAY_PASSWORD` | yes      | —                        | Login password for that account.              |

See `.env.example`. The server fails fast at startup with a clear error if
`MONDAY_EMAIL` / `MONDAY_PASSWORD` are missing.

## Install & build

```bash
cd mcp
npm install
npm run build      # compiles src/ -> dist/, entry point dist/index.js
```

Development (auto-reload):

```bash
npm run dev
```

## Using it from Claude Desktop / Claude Code

Add an entry to your MCP client config (e.g. Claude Desktop's
`claude_desktop_config.json`, or a project/user `mcp.json` for Claude Code),
using the **absolute path** to the built entry point:

```json
{
  "mcpServers": {
    "monday-clone": {
      "command": "node",
      "args": ["/absolute/path/to/mondayclone/mcp/dist/index.js"],
      "env": {
        "MONDAY_API_URL": "http://localhost:4000",
        "MONDAY_EMAIL": "admin@example.com",
        "MONDAY_PASSWORD": "change-me-admin"
      }
    }
  }
}
```

Restart the client after editing the config. The server communicates over
stdio; all logging goes to stderr so it never corrupts the protocol stream
on stdout.

## Tools

Read-only:

- `monday_list_boards` — list all boards.
- `monday_get_board {boardId}` — full board: groups, columns (with type and
  settings — status label ids, dropdown option ids), and items with cells.
  Call this first to learn ids before writing.
- `monday_list_users` — all members (id, name, email, role, active,
  avatarColor — never a password hash).
- `monday_person_activity {memberId}` — a member's items across all boards.

Content (member role or higher):

- `monday_add_item {boardId, groupId, name}`
- `monday_set_cell {itemId, columnId, value}` — raw cell write; `value` must
  match the column type (see shapes below).
- `monday_set_status {boardId, itemId, columnId, label}` — resolves a status
  label's display name to its `labelId` via the board's column settings,
  then writes it. Needs `boardId` because label definitions are per-board.
- `monday_assign_person {itemId, columnId, people}` — resolves names/emails
  to member ids via the global `/api/members` list (no `boardId` needed —
  member ids are not board-scoped) and writes them.
- `monday_set_date {itemId, columnId, date}` — `date` is `"YYYY-MM-DD"` or
  `null`.
- `monday_rename_item {itemId, name}`
- `monday_move_item {itemId, groupId}`
- `monday_delete_item {itemId}` — **destructive**, cannot be undone.

Structure (admin role):

- `monday_create_board {name}`
- `monday_add_group {boardId, name}`
- `monday_add_column {boardId, name, type}` — type is one of `text`,
  `status`, `person`, `date`, `number`, `dropdown`, `checkbox`, `timeline`,
  `files`, `link`, `tags`.
- `monday_delete_board {boardId}` — **destructive**, cannot be undone.

User management (admin role):

- `monday_create_user {name, email, password, role, avatarColor?}`
- `monday_update_user {id, name?, email?, role?, active?, password?}`
- `monday_delete_user {id}` — **destructive**, cannot be undone.

### Cell value shapes (for `monday_set_cell`)

| Column type | Value shape                                  |
|-------------|-----------------------------------------------|
| `text`      | `{ "text": string }`                           |
| `number`    | `{ "number": number \| null }`                 |
| `checkbox`  | `{ "checked": boolean }`                       |
| `status`    | `{ "labelId": string \| null }` (prefer `monday_set_status`) |
| `dropdown`  | `{ "optionIds": string[] }`                    |
| `person`    | `{ "memberIds": string[] }` (prefer `monday_assign_person`) |
| `date`      | `{ "date": "YYYY-MM-DD" \| null }` (prefer `monday_set_date`) |
| `timeline`  | `{ "start": string, "end": string }` or `{ "start": null, "end": null }` |
| `link`      | `{ "url": string, "label": string }`           |
| `tags`      | `{ "tags": string[] }`                         |
| `files`     | `{ "files": [{ "id": string, "name": string, "size": number }] }` |

## Notes

- Destructive tools (`monday_delete_item`, `monday_delete_board`,
  `monday_delete_user`) are annotated `destructiveHint: true`.
- Errors from the API are turned into actionable messages (404 → not found,
  403 → permission/role issue, 401 after retry → bad credentials, else
  status + response body snippet).
- Passwords are never logged or echoed back — the app's `/api/members`
  responses omit password hashes, and this server does not add any logging
  of request bodies.
