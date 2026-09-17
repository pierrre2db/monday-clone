export const COLUMN_TYPES = [
  "text", "status", "person", "date", "number",
  "dropdown", "checkbox", "timeline", "files", "link", "tags",
] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export type StatusLabel = { id: string; label: string; color: string };
export type DropdownOption = { id: string; label: string };
export type FileRef = { id: string; name: string; size: number };
