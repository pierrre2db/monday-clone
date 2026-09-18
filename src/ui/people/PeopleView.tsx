"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/ui/kit/Avatar";
import { StatusChip } from "@/ui/kit/Chip";
import Button from "@/ui/kit/Button";

type MemberLite = { id: string; name: string; avatarColor: string };

type PersonActivityRow = {
  boardId: string;
  boardName: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  itemId: string;
  itemName: string;
  status: { label: string; color: string } | null;
  due: string | null;
};

// Parse a stored "YYYY-MM-DD" (or timeline start) date string as local-calendar
// components rather than `new Date(str)`, which parses date-only strings as UTC
// midnight and can display a day off in negative-UTC-offset timezones.
function formatDue(due: string | null): string {
  if (!due) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(due);
  if (!m) return due;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildCsv(rows: PersonActivityRow[]): string {
  const lines = ["Board,Groupe,Item,Statut,Echeance"];
  for (const r of rows) {
    lines.push(
      [r.boardName, r.groupName, r.itemName, r.status?.label ?? "", r.due ?? ""].map(csvField).join(","),
    );
  }
  return lines.join("\n");
}

export default function PeopleView({ members }: { members: MemberLite[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<PersonActivityRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setRows(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/people/${selectedId}/items`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger l'activité de ce membre.");
        return res.json();
      })
      .then((data: PersonActivityRow[]) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, { boardId: string; boardName: string; rows: PersonActivityRow[] }>();
    for (const r of rows) {
      const g = map.get(r.boardId) ?? { boardId: r.boardId, boardName: r.boardName, rows: [] };
      g.rows.push(r);
      map.set(r.boardId, g);
    }
    return Array.from(map.values());
  }, [rows]);

  function handleExport() {
    if (!rows || !selectedMember) return;
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activite-${selectedMember.name.replace(/[^a-z0-9-_]+/gi, "_") || "membre"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Focus personne</h1>
        <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
          ← Boards
        </Link>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "6px 0 20px" }}>
        Choisissez un membre pour voir toutes ses tâches, tous boards confondus.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {members.length === 0 && <p className="empty-state">Aucun membre. Ajoutez-en depuis un board.</p>}
        {members.map((m) => {
          const active = m.id === selectedId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                opacity: selectedId && !active ? 0.55 : 1,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  borderRadius: "50%",
                  boxShadow: active ? "0 0 0 3px var(--accent)" : "0 0 0 1px var(--border)",
                }}
              >
                <Avatar name={m.name} color={m.avatarColor} size={44} />
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 600,
                  color: active ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {m.name}
              </span>
            </button>
          );
        })}
      </div>

      {selectedMember && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              {loading ? "Chargement…" : `${rows?.length ?? 0} tâche${(rows?.length ?? 0) > 1 ? "s" : ""}`}
            </span>
            <Button type="button" onClick={handleExport} disabled={!rows || rows.length === 0}>
              Exporter CSV
            </Button>
          </div>

          {error && <p className="empty-state">{error}</p>}

          {!error && !loading && rows && rows.length === 0 && (
            <p className="empty-state">Aucune tâche assignée à cette personne.</p>
          )}

          {!error &&
            grouped.map((g) => (
              <section key={g.boardId} className="group">
                <div className="group-title">
                  <span>{g.boardName}</span>
                  <span className="count">{g.rows.length}</span>
                </div>

                {/* Desktop: styled table card */}
                <div className="card desktop-only" style={{ overflowX: "auto" }}>
                  <table className="table-view">
                    <thead>
                      <tr>
                        <th>Board</th>
                        <th>Groupe</th>
                        <th>Item</th>
                        <th>Statut</th>
                        <th>Échéance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.itemId}>
                          <td>{r.boardName}</td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{ width: 10, height: 10, borderRadius: "50%", background: r.groupColor, flex: "none" }}
                              />
                              {r.groupName}
                            </span>
                          </td>
                          <td>{r.itemName}</td>
                          <td>
                            {r.status ? (
                              <StatusChip label={r.status.label} color={r.status.color} />
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td>{formatDue(r.due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked cards, one label+value row per field */}
                <div className="mobile-cards">
                  {g.rows.map((r) => (
                    <div key={r.itemId} className="mcard">
                      <div className="mcard-head">
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{r.itemName}</span>
                      </div>
                      <div className="mrow">
                        <span className="k">Board</span>
                        <span className="mrow-value">{r.boardName}</span>
                      </div>
                      <div className="mrow">
                        <span className="k">Groupe</span>
                        <span className="mrow-value">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{ width: 9, height: 9, borderRadius: "50%", background: r.groupColor, flex: "none" }}
                            />
                            {r.groupName}
                          </span>
                        </span>
                      </div>
                      <div className="mrow">
                        <span className="k">Statut</span>
                        <span className="mrow-value">
                          {r.status ? <StatusChip label={r.status.label} color={r.status.color} /> : "—"}
                        </span>
                      </div>
                      <div className="mrow">
                        <span className="k">Échéance</span>
                        <span className="mrow-value">{formatDue(r.due)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {!selectedMember && members.length > 0 && (
        <p className="empty-state">Sélectionnez une personne ci-dessus pour voir son activité.</p>
      )}
    </>
  );
}
