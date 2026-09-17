import { COLUMN_TYPES, type ColumnType } from "./types";
import { validators, defaults, emptyValue } from "./validators";

export function isColumnType(v: string): v is ColumnType {
  return (COLUMN_TYPES as readonly string[]).includes(v);
}
export function validateCellValue(type: ColumnType, settings: Record<string, unknown>, value: Record<string, unknown>) {
  return validators[type](settings ?? {}, value ?? {});
}
export function defaultSettings(type: ColumnType) {
  return defaults[type]();
}
export { emptyValue };
