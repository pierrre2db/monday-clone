"use client";
import { useMemo, useState } from "react";
import type { BoardFull, Item } from "./types";
import type { StatusLabel } from "@/lib/columns/types";
import { StatusChip } from "@/ui/kit/Chip";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({ board, onOpenItem }: { board: BoardFull; onOpenItem: (id: string) => void }) {
  const dateCols = board.columns.filter((c) => c.type === "date" || c.type === "timeline");
  const [colId, setColId] = useState(dateCols[0]?.id ?? "");
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const col = board.columns.find((c) => c.id === colId);

  // A status column (if any) drives item chip color; falls back to the accent token.
  const statusCol = board.columns.find((c) => c.type === "status");
  const statusLabels = (statusCol?.settings.labels as StatusLabel[]) ?? [];
  function colorForItem(item: Item): string {
    if (!statusCol) return "var(--accent)";
    const v = item.cells.find((c) => c.columnId === statusCol.id)?.value as { labelId?: string } | undefined;
    const label = statusLabels.find((l) => l.id === v?.labelId);
    return label?.color ?? "var(--accent)";
  }

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    if (!col) return map;
    for (const it of board.items) {
      const v = it.cells.find((c) => c.columnId === col.id)?.value as { date?: string; start?: string } | undefined;
      const day = v?.date ?? v?.start;
      if (day) { const arr = map.get(day) ?? []; arr.push(it); map.set(day, arr); }
    }
    return map;
  }, [board, col]);

  if (!col) return <p className="empty-state">Add a Date or Timeline column to use Calendar.</p>;

  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const now = new Date();
  function iso(day: number) { return `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function shift(delta: number) { const d = new Date(month.y, month.m + delta, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); }
  function isToday(day: number) {
    return now.getFullYear() === month.y && now.getMonth() === month.m && now.getDate() === day;
  }

  // Month's dated items, grouped by day, for the mobile agenda list.
  const monthPrefix = `${month.y}-${String(month.m + 1).padStart(2, "0")}-`;
  const agendaDays = Array.from(byDay.entries())
    .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
    .map(([dateKey, items]) => ({ iso: dateKey, day: Number(dateKey.slice(-2)), items }))
    .sort((a, b) => a.day - b.day);

  return (
    <div>
      <div className="cal-toolbar">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <strong>{first.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
        {dateCols.length > 1 && (
          <select className="view-select" value={colId} onChange={(e) => setColId(e.target.value)}>
            {dateCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Desktop: month grid */}
      <div className="card cal-grid desktop-only">
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
        </div>
        <div className="cal-cells">
          {cells.map((day, i) => (
            <div key={i} className={`cal-cell${day ? "" : " cal-cell--pad"}${day && isToday(day) ? " cal-cell--today" : ""}`}>
              {day && (
                <>
                  <div className="cal-daynum">{day}</div>
                  <div className="cal-chips">
                    {(byDay.get(iso(day)) ?? []).map((it) => (
                      <div
                        key={it.id}
                        className="cal-chip-wrap"
                        style={{ cursor: "pointer" }}
                        title="Ouvrir la fiche"
                        onClick={() => onOpenItem(it.id)}
                      >
                        <StatusChip label={it.name} color={colorForItem(it)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: agenda list */}
      <div className="cal-agenda">
        {agendaDays.length === 0 && <p className="empty-state">Aucune echeance ce mois</p>}
        {agendaDays.map(({ iso, day, items }) => (
          <div key={iso} className="cal-agenda-day">
            <div className="cal-agenda-date">
              {new Date(month.y, month.m, day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
            </div>
            <div className="cal-chips">
              {items.map((it) => (
                <div
                  key={it.id}
                  style={{ cursor: "pointer" }}
                  title="Ouvrir la fiche"
                  onClick={() => onOpenItem(it.id)}
                >
                  <StatusChip label={it.name} color={colorForItem(it)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
