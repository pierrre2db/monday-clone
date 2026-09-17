import type { ColumnType, StatusLabel, DropdownOption, FileRef } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function assert(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }
function isIsoDate(v: unknown): v is string { return typeof v === "string" && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)); }

type Settings = Record<string, unknown>;
type Value = Record<string, unknown>;

export const validators: Record<ColumnType, (s: Settings, v: Value) => Value> = {
  text: (_s, v) => ({ text: typeof v.text === "string" ? v.text : "" }),
  number: (_s, v) => {
    if (v.number === null || v.number === undefined) return { number: null };
    assert(typeof v.number === "number" && !Number.isNaN(v.number), "number must be a number or null");
    return { number: v.number };
  },
  checkbox: (_s, v) => ({ checked: v.checked === true }),
  status: (s, v) => {
    const labels = (s.labels as StatusLabel[]) ?? [];
    if (v.labelId === null || v.labelId === undefined) return { labelId: null };
    assert(labels.some((l) => l.id === v.labelId), "unknown status labelId");
    return { labelId: v.labelId };
  },
  dropdown: (s, v) => {
    const opts = (s.options as DropdownOption[]) ?? [];
    const ids = Array.isArray(v.optionIds) ? (v.optionIds as string[]) : [];
    ids.forEach((id) => assert(opts.some((o) => o.id === id), "unknown dropdown optionId"));
    return { optionIds: ids };
  },
  person: (_s, v) => ({ memberIds: Array.isArray(v.memberIds) ? (v.memberIds as string[]) : [] }),
  date: (_s, v) => {
    if (v.date === null || v.date === undefined) return { date: null };
    assert(isIsoDate(v.date), "date must be YYYY-MM-DD or null");
    return { date: v.date };
  },
  timeline: (_s, v) => {
    if (v.start === null || v.start === undefined) return { start: null, end: null };
    assert(isIsoDate(v.start) && isIsoDate(v.end), "timeline needs start and end dates");
    assert((v.start as string) <= (v.end as string), "timeline start must be <= end");
    return { start: v.start, end: v.end };
  },
  files: (_s, v) => {
    const files = Array.isArray(v.files) ? (v.files as FileRef[]) : [];
    files.forEach((f) => assert(typeof f.id === "string" && typeof f.name === "string", "invalid file ref"));
    return { files };
  },
  link: (_s, v) => {
    assert(typeof v.url === "string", "link requires url");
    try { new URL(v.url as string); } catch { throw new Error("link url is invalid"); }
    return { url: v.url, label: typeof v.label === "string" ? v.label : (v.url as string) };
  },
  tags: (_s, v) => ({ tags: Array.isArray(v.tags) ? (v.tags as string[]).filter((t) => typeof t === "string") : [] }),
};

export const defaults: Record<ColumnType, () => Settings> = {
  text: () => ({}),
  number: () => ({}),
  checkbox: () => ({}),
  person: () => ({}),
  date: () => ({}),
  timeline: () => ({}),
  files: () => ({}),
  link: () => ({}),
  tags: () => ({}),
  status: () => ({ labels: [
    { id: "s1", label: "Working on it", color: "#fdab3d" },
    { id: "s2", label: "Stuck", color: "#e2445c" },
    { id: "s3", label: "Done", color: "#00c875" },
  ] }),
  dropdown: () => ({ options: [
    { id: "o1", label: "Low" }, { id: "o2", label: "Medium" }, { id: "o3", label: "High" },
  ] }),
};

export function emptyValue(type: ColumnType): Value {
  return validators[type](defaults[type](), {});
}
