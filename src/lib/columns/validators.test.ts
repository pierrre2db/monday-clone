import { describe, it, expect } from "vitest";
import { validateCellValue, defaultSettings } from "./registry";

describe("validateCellValue", () => {
  it("text: keeps a string", () => {
    expect(validateCellValue("text", {}, { text: "hi" })).toEqual({ text: "hi" });
  });
  it("text: coerces empty", () => {
    expect(validateCellValue("text", {}, {})).toEqual({ text: "" });
  });
  it("number: null passes, string rejected", () => {
    expect(validateCellValue("number", {}, { number: 3 })).toEqual({ number: 3 });
    expect(() => validateCellValue("number", {}, { number: "x" })).toThrow();
  });
  it("checkbox: coerces to boolean", () => {
    expect(validateCellValue("checkbox", {}, { checked: true })).toEqual({ checked: true });
    expect(validateCellValue("checkbox", {}, {})).toEqual({ checked: false });
  });
  it("status: rejects unknown labelId", () => {
    const settings = defaultSettings("status");
    const good = (settings.labels as { id: string }[])[0].id;
    expect(validateCellValue("status", settings, { labelId: good })).toEqual({ labelId: good });
    expect(() => validateCellValue("status", settings, { labelId: "nope" })).toThrow();
  });
  it("date: validates ISO date or null", () => {
    expect(validateCellValue("date", {}, { date: "2026-01-02" })).toEqual({ date: "2026-01-02" });
    expect(validateCellValue("date", {}, { date: null })).toEqual({ date: null });
    expect(() => validateCellValue("date", {}, { date: "nope" })).toThrow();
  });
  it("timeline: start<=end or null", () => {
    expect(validateCellValue("timeline", {}, { start: "2026-01-01", end: "2026-01-05" }))
      .toEqual({ start: "2026-01-01", end: "2026-01-05" });
    expect(() => validateCellValue("timeline", {}, { start: "2026-01-05", end: "2026-01-01" })).toThrow();
  });
  it("link: requires url", () => {
    expect(validateCellValue("link", {}, { url: "https://x.com", label: "X" }))
      .toEqual({ url: "https://x.com", label: "X" });
    expect(() => validateCellValue("link", {}, { url: "not a url" })).toThrow();
  });
});
