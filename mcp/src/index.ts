#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfigFromEnv, MondayClient, MondayConfig, resolveMemberIds, resolveStatusLabelId } from "./client.js";
import { CHARACTER_LIMIT } from "./constants.js";
import type { Board, BoardSummary, PersonActivityItem, User } from "./types.js";

// ---------------------------------------------------------------------------
// Startup: validate env and construct the shared API client.
// ---------------------------------------------------------------------------

let config: MondayConfig;
try {
  config = loadConfigFromEnv();
} catch (err) {
  // stdio transport reserves stdout for protocol frames — all diagnostics go to stderr.
  console.error(`[monday-clone-mcp-server] Startup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const client = new MondayClient(config);

const server = new McpServer({
  name: "monday-clone-mcp-server",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textResult(text: string) {
  const truncated = text.length > CHARACTER_LIMIT;
  const body = truncated
    ? `${text.slice(0, CHARACTER_LIMIT)}\n\n[...truncated: response exceeded ${CHARACTER_LIMIT} characters...]`
    : text;
  return { content: [{ type: "text" as const, text: body }] };
}

function jsonResult(data: unknown) {
  return textResult(JSON.stringify(data, null, 2));
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const CellValueSchema = z
  .record(z.string(), z.unknown())
  .describe(
    "JSON object matching the target column's type. Shapes: " +
      'text {text}; number {number|null}; checkbox {checked}; status {labelId|null} ' +
      "(use monday_set_status instead to resolve a label by name); dropdown {optionIds:string[]} " +
      "(ids from the column's settings.options); person {memberIds:string[]} (use monday_assign_person " +
      "instead to resolve by name/email); date {date:\"YYYY-MM-DD\"|null}; timeline {start,end}|{start:null,end:null}; " +
      "link {url,label}; tags {tags:string[]}; files {files:[{id,name,size}]}."
  );

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

server.registerTool(
  "monday_list_boards",
  {
    title: "List Boards",
    description:
      "List all boards on the Monday-clone instance (id, name, and any summary fields the API returns). " +
      "Does not include groups/columns/items — call monday_get_board for full board detail. " +
      "Example: \"what boards exist?\" -> call with no arguments.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const boards = await client.apiRequest<BoardSummary[]>("/api/boards", "GET");
      return jsonResult(boards);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const GetBoardInputSchema = z
  .object({
    boardId: z.string().min(1).describe("The board's id, as returned by monday_list_boards."),
  })
  .strict();

server.registerTool(
  "monday_get_board",
  {
    title: "Get Board",
    description:
      "Fetch a full board: groups, columns (with type and settings — including status label ids and " +
      "dropdown option ids), and items (with their cell values). Call this before writing to a board so " +
      "you know valid groupId/columnId values, column types, and (for status columns) the labelId for each " +
      "label name. Example: \"show me the Marketing board\" -> monday_list_boards to find the id, then this tool.",
    inputSchema: GetBoardInputSchema.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ boardId }: z.infer<typeof GetBoardInputSchema>) => {
    try {
      const board = await client.apiRequest<Board>(`/api/boards/${encodeURIComponent(boardId)}`, "GET");
      return jsonResult(board);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "monday_list_users",
  {
    title: "List Users",
    description:
      "List all members/users of the Monday-clone instance: id, name, email, role (admin|member|viewer), " +
      "active, avatarColor. Never includes password hashes. Use this to look up member ids/emails before " +
      "calling monday_assign_person, or to find a user's id for monday_update_user / monday_delete_user.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const users = await client.apiRequest<User[]>("/api/members", "GET");
      return jsonResult(users);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const PersonActivityInputSchema = z
  .object({
    memberId: z.string().min(1).describe("The member's id, as returned by monday_list_users."),
  })
  .strict();

server.registerTool(
  "monday_person_activity",
  {
    title: "Get Person's Activity",
    description:
      "List a member's items across ALL boards: boardId, boardName, groupName, itemId, itemName, " +
      "status ({label,color}|null), and due (date string|null). Useful for \"what is <person> working on?\" " +
      "or \"what does <person> have due soon?\" without walking every board.",
    inputSchema: PersonActivityInputSchema.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ memberId }: z.infer<typeof PersonActivityInputSchema>) => {
    try {
      const items = await client.apiRequest<PersonActivityItem[]>(
        `/api/people/${encodeURIComponent(memberId)}/items`,
        "GET"
      );
      return jsonResult(items);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Content tools (member+)
// ---------------------------------------------------------------------------

const AddItemInputSchema = z
  .object({
    boardId: z.string().min(1).describe("The board to add the item to."),
    groupId: z.string().min(1).describe("The group (row section) within the board to place the item in."),
    name: z.string().min(1).describe("Display name of the new item."),
  })
  .strict();

server.registerTool(
  "monday_add_item",
  {
    title: "Add Item",
    description:
      "Create a new item (row) on a board, inside a specific group. Requires member role or higher. " +
      "Example: \"add a task called 'Draft proposal' to the To Do group on the Sales board\" -> " +
      "look up boardId/groupId via monday_get_board, then call this tool.",
    inputSchema: AddItemInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ boardId, groupId, name }: z.infer<typeof AddItemInputSchema>) => {
    try {
      const item = await client.apiRequest("/api/items", "POST", { boardId, groupId, name });
      return jsonResult(item);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const SetCellInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item whose cell to update."),
    columnId: z.string().min(1).describe("The column to update."),
    value: CellValueSchema,
  })
  .strict();

server.registerTool(
  "monday_set_cell",
  {
    title: "Set Cell Value",
    description:
      "Set the raw value of one cell on one item. The value's shape must match the column's type " +
      "(fetch the board with monday_get_board first to confirm the column's type and, for status/dropdown " +
      "columns, the valid ids). Shapes: text {text}; number {number|null}; checkbox {checked}; " +
      "status {labelId|null}; dropdown {optionIds:string[]}; person {memberIds:string[]}; " +
      "date {date:\"YYYY-MM-DD\"|null}; timeline {start,end}|{start:null,end:null}; link {url,label}; " +
      "tags {tags:string[]}; files {files:[{id,name,size}]}. " +
      "Prefer monday_set_status, monday_assign_person, or monday_set_date when they cover your case — " +
      "they resolve human-friendly names to the right ids for you.",
    inputSchema: SetCellInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId, columnId, value }: z.infer<typeof SetCellInputSchema>) => {
    try {
      const cell = await client.apiRequest("/api/cells", "PUT", { itemId, columnId, value });
      return jsonResult(cell);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const SetStatusInputSchema = z
  .object({
    boardId: z
      .string()
      .min(1)
      .describe("The board the item lives on (needed to read the status column's label definitions)."),
    itemId: z.string().min(1).describe("The item whose status to update."),
    columnId: z.string().min(1).describe("The status-type column to update."),
    label: z.string().min(1).describe("The status label's display name, e.g. \"Done\", \"Working on it\" (case-insensitive)."),
  })
  .strict();

server.registerTool(
  "monday_set_status",
  {
    title: "Set Status",
    description:
      "Set a status-column cell by human-readable label name instead of raw labelId. Internally this " +
      "fetches the board (to read the column's settings.labels) to resolve the label name to its id, then " +
      "PUTs the cell as {labelId}. Requires boardId because label definitions are per-board/per-column. " +
      "Example: \"mark item X as Done\" -> monday_set_status({boardId, itemId, columnId, label: \"Done\"}).",
    inputSchema: SetStatusInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ boardId, itemId, columnId, label }: z.infer<typeof SetStatusInputSchema>) => {
    try {
      const board = await client.apiRequest<Board>(`/api/boards/${encodeURIComponent(boardId)}`, "GET");
      const labelId = resolveStatusLabelId(board, columnId, label);
      const cell = await client.apiRequest("/api/cells", "PUT", { itemId, columnId, value: { labelId } });
      return jsonResult(cell);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const AssignPersonInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item to assign people to."),
    columnId: z.string().min(1).describe("The person-type column to update."),
    people: z
      .array(z.string().min(1))
      .min(1)
      .describe("Names or emails to assign (case-insensitive exact match against monday_list_users)."),
  })
  .strict();

server.registerTool(
  "monday_assign_person",
  {
    title: "Assign Person",
    description:
      "Set a person-column cell by human-readable name(s)/email(s) instead of raw memberIds. Internally " +
      "this fetches GET /api/members (the global member list — no boardId needed, since member ids are not " +
      "board-scoped) to resolve each name/email to its memberId, then PUTs the cell as {memberIds}. " +
      "Example: \"assign this task to Alice and bob@example.com\" -> " +
      'monday_assign_person({itemId, columnId, people: ["Alice", "bob@example.com"]}).',
    inputSchema: AssignPersonInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId, columnId, people }: z.infer<typeof AssignPersonInputSchema>) => {
    try {
      const users = await client.apiRequest<User[]>("/api/members", "GET");
      const memberIds = resolveMemberIds(users, people);
      const cell = await client.apiRequest("/api/cells", "PUT", { itemId, columnId, value: { memberIds } });
      return jsonResult(cell);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const SetDateInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item whose date to update."),
    columnId: z.string().min(1).describe("The date-type column to update."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .nullable()
      .describe('Date as "YYYY-MM-DD", or null to clear it.'),
  })
  .strict();

server.registerTool(
  "monday_set_date",
  {
    title: "Set Date",
    description:
      'Set a date-column cell. Pass date: "YYYY-MM-DD" to set it, or date: null to clear it. ' +
      'Example: monday_set_date({itemId, columnId, date: "2026-10-01"}).',
    inputSchema: SetDateInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId, columnId, date }: z.infer<typeof SetDateInputSchema>) => {
    try {
      const cell = await client.apiRequest("/api/cells", "PUT", { itemId, columnId, value: { date } });
      return jsonResult(cell);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const RenameItemInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item to rename."),
    name: z.string().min(1).describe("The item's new display name."),
  })
  .strict();

server.registerTool(
  "monday_rename_item",
  {
    title: "Rename Item",
    description: "Rename an item. Requires member role or higher.",
    inputSchema: RenameItemInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId, name }: z.infer<typeof RenameItemInputSchema>) => {
    try {
      const item = await client.apiRequest(`/api/items/${encodeURIComponent(itemId)}`, "PATCH", { name });
      return jsonResult(item);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const MoveItemInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item to move."),
    groupId: z.string().min(1).describe("The destination group's id (must be on the same board)."),
  })
  .strict();

server.registerTool(
  "monday_move_item",
  {
    title: "Move Item",
    description: "Move an item to a different group on the same board. Requires member role or higher.",
    inputSchema: MoveItemInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId, groupId }: z.infer<typeof MoveItemInputSchema>) => {
    try {
      const item = await client.apiRequest(`/api/items/${encodeURIComponent(itemId)}`, "PATCH", { groupId });
      return jsonResult(item);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const DeleteItemInputSchema = z
  .object({
    itemId: z.string().min(1).describe("The item to permanently delete."),
  })
  .strict();

server.registerTool(
  "monday_delete_item",
  {
    title: "Delete Item",
    description:
      "Permanently delete an item and its cell values. This cannot be undone. Requires member role or higher.",
    inputSchema: DeleteItemInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ itemId }: z.infer<typeof DeleteItemInputSchema>) => {
    try {
      await client.apiRequest(`/api/items/${encodeURIComponent(itemId)}`, "DELETE");
      return textResult(`Deleted item ${itemId}.`);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Structure tools (admin)
// ---------------------------------------------------------------------------

const CreateBoardInputSchema = z
  .object({
    name: z.string().min(1).describe("Display name of the new board."),
  })
  .strict();

server.registerTool(
  "monday_create_board",
  {
    title: "Create Board",
    description: "Create a new, empty board. Requires admin role.",
    inputSchema: CreateBoardInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ name }: z.infer<typeof CreateBoardInputSchema>) => {
    try {
      const board = await client.apiRequest("/api/boards", "POST", { name });
      return jsonResult(board);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const AddGroupInputSchema = z
  .object({
    boardId: z.string().min(1).describe("The board to add the group to."),
    name: z.string().min(1).describe("Display name of the new group."),
  })
  .strict();

server.registerTool(
  "monday_add_group",
  {
    title: "Add Group",
    description: "Add a new group (row section) to a board. Requires admin role.",
    inputSchema: AddGroupInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ boardId, name }: z.infer<typeof AddGroupInputSchema>) => {
    try {
      const group = await client.apiRequest("/api/groups", "POST", { boardId, name });
      return jsonResult(group);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const ColumnTypeEnum = z.enum([
  "text",
  "status",
  "person",
  "date",
  "number",
  "dropdown",
  "checkbox",
  "timeline",
  "files",
  "link",
  "tags",
]);

const AddColumnInputSchema = z
  .object({
    boardId: z.string().min(1).describe("The board to add the column to."),
    name: z.string().min(1).describe("Display name of the new column."),
    type: ColumnTypeEnum.describe(
      "Column type: text, status, person, date, number, dropdown, checkbox, timeline, files, link, or tags."
    ),
  })
  .strict();

server.registerTool(
  "monday_add_column",
  {
    title: "Add Column",
    description:
      "Add a new column to a board. Requires admin role. New status/dropdown columns are created with " +
      "default (empty or app-default) label/option sets — fetch the board afterwards with monday_get_board " +
      "to see the generated settings.labels / settings.options before writing to that column.",
    inputSchema: AddColumnInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ boardId, name, type }: z.infer<typeof AddColumnInputSchema>) => {
    try {
      const column = await client.apiRequest("/api/columns", "POST", { boardId, name, type });
      return jsonResult(column);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const DeleteBoardInputSchema = z
  .object({
    boardId: z.string().min(1).describe("The board to permanently delete."),
  })
  .strict();

server.registerTool(
  "monday_delete_board",
  {
    title: "Delete Board",
    description:
      "Permanently delete a board and everything on it (groups, columns, items, cells). This cannot be " +
      "undone. Requires admin role.",
    inputSchema: DeleteBoardInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ boardId }: z.infer<typeof DeleteBoardInputSchema>) => {
    try {
      await client.apiRequest(`/api/boards/${encodeURIComponent(boardId)}`, "DELETE");
      return textResult(`Deleted board ${boardId}.`);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// ---------------------------------------------------------------------------
// User management tools (admin)
// ---------------------------------------------------------------------------

const UserRoleEnum = z.enum(["admin", "member", "viewer"]);

const CreateUserInputSchema = z
  .object({
    name: z.string().min(1).describe("Display name."),
    email: z.string().email().describe("Login email, must be unique."),
    password: z.string().min(1).describe("Initial password (stored hashed by the app; never logged)."),
    role: UserRoleEnum.describe("admin, member, or viewer."),
    avatarColor: z.string().optional().describe("Optional avatar color (e.g. a CSS color or hex string)."),
  })
  .strict();

server.registerTool(
  "monday_create_user",
  {
    title: "Create User",
    description: "Create a new member account. Requires admin role. The password is never echoed back or logged.",
    inputSchema: CreateUserInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (input: z.infer<typeof CreateUserInputSchema>) => {
    try {
      const user = await client.apiRequest<User>("/api/members", "POST", input);
      return jsonResult(user);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const UpdateUserInputSchema = z
  .object({
    id: z.string().min(1).describe("The user id to update."),
    name: z.string().min(1).optional().describe("New display name."),
    email: z.string().email().optional().describe("New login email."),
    role: UserRoleEnum.optional().describe("New role: admin, member, or viewer."),
    active: z.boolean().optional().describe("Set false to deactivate the account without deleting it."),
    password: z.string().min(1).optional().describe("New password (never echoed back or logged)."),
  })
  .strict();

server.registerTool(
  "monday_update_user",
  {
    title: "Update User",
    description:
      "Update one or more fields of an existing user (name, email, role, active flag, password). Only the " +
      "fields provided are changed. Requires admin role.",
    inputSchema: UpdateUserInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ id, ...patch }: z.infer<typeof UpdateUserInputSchema>) => {
    try {
      const user = await client.apiRequest<User>(`/api/members/${encodeURIComponent(id)}`, "PATCH", patch);
      return jsonResult(user);
    } catch (err) {
      return errorResult(err);
    }
  }
);

const DeleteUserInputSchema = z
  .object({
    id: z.string().min(1).describe("The user id to permanently delete."),
  })
  .strict();

server.registerTool(
  "monday_delete_user",
  {
    title: "Delete User",
    description: "Permanently delete a user account. This cannot be undone. Requires admin role.",
    inputSchema: DeleteUserInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ id }: z.infer<typeof DeleteUserInputSchema>) => {
    try {
      await client.apiRequest(`/api/members/${encodeURIComponent(id)}`, "DELETE");
      return textResult(`Deleted user ${id}.`);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[monday-clone-mcp-server] Ready. API: ${config.apiUrl} | Auth as: ${config.email} | Transport: stdio`
  );
}

main().catch((err) => {
  console.error(`[monday-clone-mcp-server] Fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
