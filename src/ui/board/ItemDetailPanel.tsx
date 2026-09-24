"use client";
import { useEffect, useState } from "react";
import type { BoardFull, Item, Member, TimeEntry } from "./types";
import { cellRegistry } from "./cells/registry";
import { ReadOnlyCell } from "./cells/ReadOnlyCell";
import Button from "@/ui/kit/Button";
import { api } from "./api";
import { formatMinutes } from "./time";

type Props = {
  item: Item;
  board: BoardFull;
  members: Member[];
  canEdit: boolean;
  meId?: string;
  isAdmin: boolean;
  onClose: () => void;
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  renameItem: (id: string, name: string) => void;
  deleteItem: (id: string) => void;
};

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ItemDetailPanel({ item, board, members, canEdit, meId, isAdmin, onClose, saveCell, renameItem, deleteItem }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const group = board.groups.find((g) => g.id === item.groupId);

  function handleDelete() {
    if (!window.confirm("Supprimer ce ticket ?")) return;
    deleteItem(item.id);
    onClose();
  }

  // ---- Temps (time tracking) ----
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeLoading, setTimeLoading] = useState(true);
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refetchTime() {
    try {
      const rows = (await api.listItemTime(item.id)) as TimeEntry[];
      setTimeEntries(rows);
    } catch {
      // leave whatever was previously loaded
    }
  }

  useEffect(() => {
    let cancelled = false;
    setTimeLoading(true);
    api.listItemTime(item.id)
      .then((rows) => { if (!cancelled) setTimeEntries(rows as TimeEntry[]); })
      .catch(() => { if (!cancelled) setTimeEntries([]); })
      .finally(() => { if (!cancelled) setTimeLoading(false); });
    return () => { cancelled = true; };
  }, [item.id]);

  function bumpMinutes(delta: number) {
    setMinutes((m) => {
      const next = (Number(m) || 0) + delta;
      return String(Math.min(1440, Math.max(1, next)));
    });
  }

  async function submitTime() {
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
      setTimeError("Minutes : indiquez un nombre entre 1 et 1440.");
      return;
    }
    setTimeError(null);
    setSubmitting(true);
    try {
      await api.addTime(item.id, { minutes: Math.round(mins), date: date || todayISO(), note: note.trim() || undefined });
      setMinutes("");
      setNote("");
      setDate(todayISO());
      await refetchTime();
    } catch (e) {
      setTimeError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeTime(id: string) {
    const prev = timeEntries;
    setTimeEntries((es) => es.filter((e) => e.id !== id));
    try {
      await api.deleteTimeEntry(id);
    } catch (e) {
      setTimeEntries(prev);
      alert((e as Error).message);
    }
  }

  const totalMinutes = timeEntries.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="item-panel-backdrop" onMouseDown={onClose}>
      <div
        className="item-panel"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="item-panel-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {canEdit ? (
              <input
                key={item.id}
                defaultValue={item.name}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed) { e.target.value = item.name; return; }
                  if (trimmed !== item.name) renameItem(item.id, trimmed);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    (e.target as HTMLInputElement).value = item.name;
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="item-panel-name-input"
                aria-label="Nom de l'item"
              />
            ) : (
              <div className="item-panel-name-input" aria-label="Nom de l'item">
                {item.name}
              </div>
            )}
            {group && (
              <div className="item-panel-group-badge">
                <span className="dot" style={{ background: group.color }} />
                {group.name}
              </div>
            )}
          </div>
          <button onClick={onClose} title="Fermer" className="x-btn item-panel-close">×</button>
        </div>

        <div className="item-panel-body">
          {board.columns.map((col) => {
            const cell = item.cells.find((c) => c.columnId === col.id);
            const Editor = cellRegistry[col.type].Editor;
            return (
              <div key={col.id} className="item-panel-field">
                <div className="item-panel-field-label">{col.name}</div>
                <div className="item-panel-field-control">
                  {canEdit ? (
                    <Editor
                      column={col}
                      members={members}
                      value={cell?.value ?? {}}
                      onChange={(v) => saveCell(item.id, col.id, v)}
                    />
                  ) : (
                    <ReadOnlyCell column={col} members={members} value={cell?.value ?? {}} />
                  )}
                </div>
              </div>
            );
          })}

          <div className="item-panel-field">
            <div className="item-panel-field-label">Temps</div>
            <div className="item-panel-field-control">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Total : {formatMinutes(totalMinutes)}
              </div>

              {timeLoading ? (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Chargement…</div>
              ) : timeEntries.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun temps enregistré.</div>
              ) : (
                <div style={{ display: "grid", gap: 4, marginBottom: canEdit ? 12 : 0 }}>
                  {timeEntries.map((e) => (
                    <div key={e.id} className="time-entry-row">
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{e.date}</span>
                      <span style={{ fontWeight: 600 }}>{e.memberName}</span>
                      <span>{formatMinutes(e.minutes)}</span>
                      {e.note && (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }} title={e.note}>{e.note}</span>
                      )}
                      <div style={{ flex: 1 }} />
                      {canEdit && (e.memberId === meId || isAdmin) && (
                        <button
                          onClick={() => removeTime(e.id)}
                          title="Supprimer cette entrée"
                          aria-label={`Supprimer l'entrée de temps de ${e.memberName}`}
                          className="x-btn"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canEdit && (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    paddingTop: 10,
                    borderTop: timeEntries.length > 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="Minutes"
                      aria-label="Minutes"
                      className="text-input"
                      style={{ width: 90, fontSize: 13 }}
                    />
                    <Button type="button" variant="ghost" onClick={() => bumpMinutes(15)}>+15</Button>
                    <Button type="button" variant="ghost" onClick={() => bumpMinutes(30)}>+30</Button>
                    <Button type="button" variant="ghost" onClick={() => bumpMinutes(60)}>+60</Button>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Date"
                      className="text-input"
                      style={{ fontSize: 13, minWidth: 140, flex: "1 1 140px" }}
                    />
                  </div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optionnel)"
                    aria-label="Note"
                    className="text-input"
                    style={{ fontSize: 13 }}
                  />
                  {timeError && (
                    <div style={{ color: "var(--c-red)", fontSize: 12 }}>{timeError}</div>
                  )}
                  <Button type="button" onClick={submitTime} disabled={submitting}>
                    Ajouter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="item-panel-footer">
            <Button type="button" variant="danger" onClick={handleDelete}>
              Supprimer le ticket
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
