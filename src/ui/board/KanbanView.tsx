"use client";
import { useState } from "react";
import { DndContext, type DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import type { BoardFull, Member } from "./types";
import type { StatusLabel } from "@/lib/columns/types";
import { AvatarStack } from "@/ui/kit/Avatar";

type Props = {
  board: BoardFull; members: Member[];
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
};

export default function KanbanView({ board, members, saveCell }: Props) {
  const statusCols = board.columns.filter((c) => c.type === "status");
  const [statusColId, setStatusColId] = useState(statusCols[0]?.id ?? "");
  const col = board.columns.find((c) => c.id === statusColId);
  if (!col) return <p className="empty-state">Add a Status column to use Kanban.</p>;
  const labels = (col.settings.labels as StatusLabel[]) ?? [];
  const lanes = [{ id: "", label: "No status", color: "var(--c-gray)" }, ...labels];

  const personCol = board.columns.find((c) => c.type === "person");

  function onDragEnd(e: DragEndEvent) {
    const itemId = String(e.active.id);
    const labelId = e.over ? String(e.over.id) : null;
    if (e.over) saveCell(itemId, col!.id, { labelId: labelId || null });
  }

  return (
    <div>
      {statusCols.length > 1 && (
        <select className="view-select" value={statusColId} onChange={(e) => setStatusColId(e.target.value)}>
          {statusCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <DndContext onDragEnd={onDragEnd}>
        <div className="kan">
          {lanes.map((lane) => {
            const items = board.items.filter((it) => {
              const v = it.cells.find((c) => c.columnId === col.id)?.value as { labelId?: string } | undefined;
              return (v?.labelId ?? "") === lane.id;
            });
            const cards = items.map((i) => {
              const assignees = personCol
                ? (((i.cells.find((c) => c.columnId === personCol.id)?.value as { memberIds?: string[] } | undefined)
                    ?.memberIds ?? [])
                    .map((mid) => members.find((m) => m.id === mid))
                    .filter((m): m is Member => Boolean(m)))
                : [];
              return { id: i.id, name: i.name, assignees };
            });
            return <Lane key={lane.id || "none"} lane={lane} cards={cards} />;
          })}
        </div>
      </DndContext>
    </div>
  );
}

function Lane({
  lane, cards,
}: {
  lane: { id: string; label: string; color: string };
  cards: { id: string; name: string; assignees: Member[] }[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });
  return (
    <div ref={setNodeRef} className="lane" style={isOver ? { borderColor: "var(--accent)" } : undefined}>
      <div className="lane-h">
        <span className="dot" style={{ background: lane.color }} />
        {lane.label}
        <span className="count">{cards.length}</span>
      </div>
      {cards.map((c) => <Card key={c.id} id={c.id} name={c.name} assignees={c.assignees} />)}
    </div>
  );
}

function Card({ id, name, assignees }: { id: string; name: string; assignees: Member[] }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style: React.CSSProperties = {
    cursor: "grab",
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, boxShadow: "var(--shadow-lg)" } : undefined),
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="kcard" style={style}>
      <div className="t">{name}</div>
      {assignees.length > 0 && (
        <div className="meta" style={{ justifyContent: "flex-end" }}>
          <AvatarStack members={assignees.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }))} size={24} />
        </div>
      )}
    </div>
  );
}
