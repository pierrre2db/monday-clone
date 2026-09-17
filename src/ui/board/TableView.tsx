"use client";
import { useState } from "react";
import type { BoardFull, Member } from "./types";
import { cellRegistry } from "./cells/registry";

type Props = {
  board: BoardFull; members: Member[];
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
  deleteItem: (id: string) => void;
  renameItem: (id: string, name: string) => void;
  deleteColumn: (id: string) => void;
  renameColumn: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
};
export default function TableView({
  board, members, saveCell, addItem,
  deleteItem, renameItem, deleteColumn, renameColumn, deleteGroup, renameGroup,
}: Props) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {board.groups.map((group) => {
        const items = board.items.filter((i) => i.groupId === group.id);
        return (
          <section key={group.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <InlineEditable
                key={group.name}
                value={group.name}
                onCommit={(name) => renameGroup(group.id, name)}
                style={{ ...groupNameInput, color: group.color }}
              />
              <button
                onClick={() => deleteGroup(group.id)}
                title="Delete group"
                style={xButton}
              >
                ×
              </button>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={cellTh}>Item</th>
                  {board.columns.map((c) => (
                    <th key={c.id} style={cellTh}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <InlineEditable
                          key={c.name}
                          value={c.name}
                          onCommit={(name) => renameColumn(c.id, name)}
                          style={colNameInput}
                        />
                        <button
                          onClick={() => deleteColumn(c.id)}
                          title="Delete column"
                          style={xButton}
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <InlineEditable
                          key={item.name}
                          value={item.name}
                          onCommit={(name) => renameItem(item.id, name)}
                          style={itemNameInput}
                        />
                        <button
                          onClick={() => deleteItem(item.id)}
                          title="Delete item"
                          style={xButton}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                    {board.columns.map((col) => {
                      const cell = item.cells.find((c) => c.columnId === col.id);
                      const Editor = cellRegistry[col.type].Editor;
                      return (
                        <td key={col.id} style={cellTd}>
                          <Editor
                            column={col} members={members}
                            value={cell?.value ?? {}}
                            onChange={(v) => saveCell(item.id, col.id, v)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td style={cellTd}>
                    <button onClick={() => addItem(group.id)}>+ Add item</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function InlineEditable({
  value, onCommit, style,
}: { value: string; onCommit: (value: string) => void; style?: React.CSSProperties }) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        if (!trimmed) { setDraft(value); return; }
        if (trimmed !== value) onCommit(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); }
      }}
      style={style}
    />
  );
}

const cellTh: React.CSSProperties = { border: "1px solid #e6e9ef", padding: "6px 10px", textAlign: "left", background: "#f5f6f8" };
const cellTd: React.CSSProperties = { border: "1px solid #e6e9ef", padding: "4px 8px" };
const xButton: React.CSSProperties = {
  border: "none", background: "transparent", color: "#9aa1ab", cursor: "pointer",
  fontSize: 13, lineHeight: 1, padding: "2px 4px", flexShrink: 0,
};
const baseInput: React.CSSProperties = {
  border: "1px solid transparent", background: "transparent", font: "inherit", padding: "2px 4px",
  borderRadius: 4, minWidth: 0, flex: 1,
};
const groupNameInput: React.CSSProperties = { ...baseInput, fontSize: 16, fontWeight: 600 };
const colNameInput: React.CSSProperties = { ...baseInput, fontWeight: 600, background: "#f5f6f8" };
const itemNameInput: React.CSSProperties = { ...baseInput };
