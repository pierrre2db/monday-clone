"use client";
import { useMemo, useState } from "react";
import type { BoardFull } from "./types";

export default function CalendarView({ board }: { board: BoardFull }) {
  const dateCols = board.columns.filter((c) => c.type === "date" || c.type === "timeline");
  const [colId, setColId] = useState(dateCols[0]?.id ?? "");
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const col = board.columns.find((c) => c.id === colId);

  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!col) return map;
    for (const it of board.items) {
      const v = it.cells.find((c) => c.columnId === col.id)?.value as { date?: string; start?: string } | undefined;
      const day = v?.date ?? v?.start;
      if (day) { const arr = map.get(day) ?? []; arr.push(it.name); map.set(day, arr); }
    }
    return map;
  }, [board, col]);

  if (!col) return <p>Add a Date or Timeline column to use Calendar.</p>;
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function iso(day: number) { return `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function shift(delta: number) { const d = new Date(month.y, month.m + delta, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => shift(-1)}>‹</button>
        <strong>{first.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
        <button onClick={() => shift(1)}>›</button>
        {dateCols.length > 1 && (
          <select value={colId} onChange={(e) => setColId(e.target.value)}>
            {dateCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} style={{ fontWeight: 700 }}>{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} style={{ minHeight: 72, border: "1px solid #e6e9ef", padding: 4, background: day ? "#fff" : "#fafafa" }}>
            {day && <div style={{ fontSize: 12, color: "#888" }}>{day}</div>}
            {day && (byDay.get(iso(day)) ?? []).map((name, j) => (
              <div key={j} style={{ fontSize: 12, background: "#579bfc", color: "#fff", borderRadius: 4, padding: "1px 4px", marginTop: 2 }}>{name}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
