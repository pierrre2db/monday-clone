"use client";
import { useEffect } from "react";
import type { BoardFull, Item, Member } from "./types";
import { cellRegistry } from "./cells/registry";
import { ReadOnlyCell } from "./cells/ReadOnlyCell";
import Button from "@/ui/kit/Button";

type Props = {
  item: Item;
  board: BoardFull;
  members: Member[];
  canEdit: boolean;
  onClose: () => void;
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  renameItem: (id: string, name: string) => void;
  deleteItem: (id: string) => void;
};

export default function ItemDetailPanel({ item, board, members, canEdit, onClose, saveCell, renameItem, deleteItem }: Props) {
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
