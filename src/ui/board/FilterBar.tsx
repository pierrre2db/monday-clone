"use client";
import type { BoardFull, Filters, Member } from "./types";
import type { StatusLabel } from "@/lib/columns/types";
import Button from "@/ui/kit/Button";
import Popover from "@/ui/kit/Popover";
import Avatar from "@/ui/kit/Avatar";

export type { Filters };

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function FilterBar({
  board, members, filters, onChange,
}: {
  board: BoardFull;
  members: Member[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const hasStatusColumn = board.columns.some((c) => c.type === "status");

  const labelMap = new Map<string, StatusLabel>();
  for (const col of board.columns) {
    if (col.type !== "status") continue;
    const labels = (col.settings.labels as StatusLabel[]) ?? [];
    for (const l of labels) if (!labelMap.has(l.id)) labelMap.set(l.id, l);
  }
  const statusLabels = Array.from(labelMap.values());

  const activeCount = filters.memberIds.length + filters.labelIds.length + filters.groupIds.length;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "2px 0 14px" }}>
      <Popover
        trigger={({ toggle: open }) => (
          <Button type="button" variant="ghost" onClick={open} style={pillStyle(filters.memberIds.length > 0)}>
            Personne{filters.memberIds.length > 0 ? ` (${filters.memberIds.length})` : ""}
          </Button>
        )}
      >
        {() => (
          <div style={listStyle}>
            {members.length === 0 && <p style={emptyStyle}>Aucun membre</p>}
            {members.map((m) => (
              <label key={m.id} style={rowStyle}>
                <input
                  type="checkbox"
                  checked={filters.memberIds.includes(m.id)}
                  onChange={() => onChange({ ...filters, memberIds: toggleId(filters.memberIds, m.id) })}
                />
                <Avatar name={m.name} color={m.avatarColor} size={22} />
                <span style={{ fontSize: 13.5 }}>{m.name}</span>
              </label>
            ))}
          </div>
        )}
      </Popover>

      {hasStatusColumn && (
        <Popover
          trigger={({ toggle: open }) => (
            <Button type="button" variant="ghost" onClick={open} style={pillStyle(filters.labelIds.length > 0)}>
              Statut{filters.labelIds.length > 0 ? ` (${filters.labelIds.length})` : ""}
            </Button>
          )}
        >
          {() => (
            <div style={listStyle}>
              {statusLabels.length === 0 && <p style={emptyStyle}>Aucun statut</p>}
              {statusLabels.map((l) => (
                <label key={l.id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={filters.labelIds.includes(l.id)}
                    onChange={() => onChange({ ...filters, labelIds: toggleId(filters.labelIds, l.id) })}
                  />
                  <span style={{ ...dotStyle, background: l.color }} />
                  <span style={{ fontSize: 13.5 }}>{l.label}</span>
                </label>
              ))}
            </div>
          )}
        </Popover>
      )}

      <Popover
        trigger={({ toggle: open }) => (
          <Button type="button" variant="ghost" onClick={open} style={pillStyle(filters.groupIds.length > 0)}>
            Groupe{filters.groupIds.length > 0 ? ` (${filters.groupIds.length})` : ""}
          </Button>
        )}
      >
        {() => (
          <div style={listStyle}>
            {board.groups.length === 0 && <p style={emptyStyle}>Aucun groupe</p>}
            {board.groups.map((g) => (
              <label key={g.id} style={rowStyle}>
                <input
                  type="checkbox"
                  checked={filters.groupIds.includes(g.id)}
                  onChange={() => onChange({ ...filters, groupIds: toggleId(filters.groupIds, g.id) })}
                />
                <span style={{ ...dotStyle, background: g.color }} />
                <span style={{ fontSize: 13.5 }}>{g.name}</span>
              </label>
            ))}
          </div>
        )}
      </Popover>

      {activeCount > 0 && (
        <>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange({ memberIds: [], labelIds: [], groupIds: [] })}
          >
            Effacer
          </Button>
        </>
      )}
    </div>
  );
}

const listStyle: React.CSSProperties = { minWidth: 200, maxHeight: 280, overflowY: "auto" };
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", borderRadius: 6,
};
const dotStyle: React.CSSProperties = { width: 10, height: 10, borderRadius: "50%", flex: "none" };
const emptyStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12.5, margin: "4px 0" };

function pillStyle(active: boolean): React.CSSProperties {
  return active ? { borderColor: "var(--accent)", color: "var(--accent)" } : {};
}
