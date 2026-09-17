"use client";
import { useState } from "react";
import { DndContext, type DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import type { BoardFull, Member } from "./types";
import type { StatusLabel } from "@/lib/columns/types";

type Props = {
  board: BoardFull; members: Member[];
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
};

export default function KanbanView({ board, saveCell }: Props) {
  const statusCols = board.columns.filter((c) => c.type === "status");
  const [statusColId, setStatusColId] = useState(statusCols[0]?.id ?? "");
  const col = board.columns.find((c) => c.id === statusColId);
  if (!col) return <p>Add a Status column to use Kanban.</p>;
  const labels = (col.settings.labels as StatusLabel[]) ?? [];
  const lanes = [{ id: "", label: "No status", color: "#c4c4c4" }, ...labels];

  function onDragEnd(e: DragEndEvent) {
    const itemId = String(e.active.id);
    const labelId = e.over ? String(e.over.id) : null;
    if (e.over) saveCell(itemId, col!.id, { labelId: labelId || null });
  }

  return (
    <div>
      {statusCols.length > 1 && (
        <select value={statusColId} onChange={(e) => setStatusColId(e.target.value)}>
          {statusCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <DndContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {lanes.map((lane) => {
            const items = board.items.filter((it) => {
              const v = it.cells.find((c) => c.columnId === col.id)?.value as { labelId?: string } | undefined;
              return (v?.labelId ?? "") === lane.id;
            });
            return <Lane key={lane.id || "none"} lane={lane} itemNames={items.map((i) => ({ id: i.id, name: i.name }))} />;
          })}
        </div>
      </DndContext>
    </div>
  );
}

function Lane({ lane, itemNames }: { lane: { id: string; label: string; color: string }; itemNames: { id: string; name: string }[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });
  return (
    <div ref={setNodeRef} style={{ minWidth: 200, background: isOver ? "#eef" : "#f5f6f8", padding: 8, borderRadius: 8 }}>
      <h4 style={{ color: lane.color }}>{lane.label}</h4>
      {itemNames.map((i) => <Card key={i.id} id={i.id} name={i.name} />)}
    </div>
  );
}

function Card({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={{ ...style, background: "#fff", border: "1px solid #e6e9ef", borderRadius: 6, padding: 8, marginBottom: 6, cursor: "grab" }}>
      {name}
    </div>
  );
}
