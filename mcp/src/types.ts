/** Shared type definitions mirroring the Monday-clone app's REST API shapes. */

export type ColumnType =
  | "text"
  | "status"
  | "person"
  | "date"
  | "number"
  | "dropdown"
  | "checkbox"
  | "timeline"
  | "files"
  | "link"
  | "tags";

export type UserRole = "admin" | "member" | "viewer";

export interface StatusLabel {
  id: string;
  label: string;
  color: string;
}

export interface DropdownOption {
  id: string;
  label: string;
}

export interface ColumnSettings {
  labels?: StatusLabel[];
  options?: DropdownOption[];
  [key: string]: unknown;
}

export interface BoardColumn {
  id: string;
  name: string;
  type: ColumnType;
  settings?: ColumnSettings;
  position: number;
}

export interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface Cell {
  id: string;
  itemId: string;
  columnId: string;
  value: unknown;
}

export interface BoardItem {
  id: string;
  groupId: string;
  name: string;
  position: number;
  cells: Cell[];
}

export interface BoardSummary {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  groups: BoardGroup[];
  columns: BoardColumn[];
  items: BoardItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  avatarColor?: string;
}

export interface AuthMe {
  authenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface PersonActivityItem {
  boardId: string;
  boardName: string;
  groupName: string;
  itemId: string;
  itemName: string;
  status: { label: string; color: string } | null;
  due: string | null;
}
