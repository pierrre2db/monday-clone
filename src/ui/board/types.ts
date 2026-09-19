import type { ColumnType } from "@/lib/columns/types";

export type Cell = { id: string; itemId: string; columnId: string; value: Record<string, unknown> };
export type Item = { id: string; groupId: string; name: string; position: number; cells: Cell[] };
export type Group = { id: string; name: string; color: string; position: number };
export type Column = { id: string; name: string; type: ColumnType; settings: Record<string, unknown>; position: number };
export type BoardFull = {
  id: string; name: string; description: string;
  groups: Group[]; columns: Column[]; items: Item[];
};
export type Role = "admin" | "member" | "viewer";
export type Member = { id: string; name: string; email: string; role: Role; active: boolean; avatarColor: string };
export type Filters = { memberIds: string[]; labelIds: string[]; groupIds: string[] };
