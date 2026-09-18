"use client";
import { useState } from "react";
import type { BoardFull, Column, Item, Member } from "./types";
import { cellRegistry } from "./cells/registry";
import ColumnSettings from "./ColumnSettings";

type Props = {
  board: BoardFull; members: Member[]; admin: boolean;
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
  deleteItem: (id: string) => void;
  renameItem: (id: string, name: string) => void;
  deleteColumn: (id: string) => void;
  renameColumn: (id: string, name: string) => void;
  updateColumnSettings: (id: string, settings: Record<string, unknown>) => void;
  deleteGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  onOpenItem: (id: string) => void;
};
export default function TableView({
  board, members, admin, saveCell, addItem,
  deleteItem, renameItem, deleteColumn, renameColumn, updateColumnSettings, deleteGroup, renameGroup,
  onOpenItem,
}: Props) {
  const [settingsColId, setSettingsColId] = useState<string | null>(null);

  // Shared between desktop <td> and mobile .mrow so both surfaces use the exact
  // same cellRegistry editor instance/props.
  function renderCellEditor(item: Item, col: Column) {
    const cell = item.cells.find((c) => c.columnId === col.id);
    const Editor = cellRegistry[col.type].Editor;
    return (
      <Editor
        column={col}
        members={members}
        value={cell?.value ?? {}}
        onChange={(v) => saveCell(item.id, col.id, v)}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {board.groups.map((group) => {
        const items = board.items.filter((i) => i.groupId === group.id);
        return (
          <section key={group.id} className="group">
            <div className="group-title">
              <span className="dot" style={{ background: group.color }} />
              <InlineEditable
                key={group.name}
                value={group.name}
                onCommit={(name) => renameGroup(group.id, name)}
                className="inline-input inline-input--group"
                inputStyle={{ color: group.color }}
              />
              <span className="count">{items.length}</span>
              <button
                onClick={() => deleteGroup(group.id)}
                title="Delete group"
                className="x-btn"
              >
                ×
              </button>
            </div>

            {/* Desktop: styled table card, sticky first column, horizontal scroll */}
            <div className="card desktop-only" style={{ overflowX: "auto" }}>
              <table className="table-view">
                <thead>
                  <tr>
                    <th className="sticky-col">Item</th>
                    {board.columns.map((c) => (
                      <th key={c.id} style={{ position: "relative" }}>
                        <div className="header-controls">
                          <InlineEditable
                            key={c.name}
                            value={c.name}
                            onCommit={(name) => renameColumn(c.id, name)}
                            className="inline-input inline-input--col"
                          />
                          {admin && (c.type === "status" || c.type === "dropdown") && (
                            <button
                              onClick={() => setSettingsColId((id) => (id === c.id ? null : c.id))}
                              title="Column settings"
                              className="x-btn"
                            >
                              ⚙
                            </button>
                          )}
                          <button
                            onClick={() => deleteColumn(c.id)}
                            title="Delete column"
                            className="x-btn"
                          >
                            ×
                          </button>
                        </div>
                        {settingsColId === c.id && (
                          <ColumnSettings
                            column={c}
                            onSave={(settings) => {
                              updateColumnSettings(c.id, settings);
                              setSettingsColId(null);
                            }}
                            onClose={() => setSettingsColId(null)}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="sticky-col">
                        <div className="item-name-cell">
                          <InlineEditable
                            key={item.name}
                            value={item.name}
                            onCommit={(name) => renameItem(item.id, name)}
                            className="inline-input inline-input--item"
                          />
                          <button
                            onClick={() => onOpenItem(item.id)}
                            title="Ouvrir la fiche"
                            className="x-btn"
                          >
                            ⤢
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            title="Delete item"
                            className="x-btn"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                      {board.columns.map((col) => (
                        <td key={col.id}>{renderCellEditor(item, col)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr className="add-row">
                    <td className="sticky-col" colSpan={board.columns.length + 1}>
                      <button className="add-btn" onClick={() => addItem(group.id)}>
                        + Add item
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked item cards, one label+editor row per column */}
            <div className="mobile-cards">
              {items.map((item) => (
                <div key={item.id} className="mcard">
                  <div className="mcard-head">
                    <InlineEditable
                      key={item.name}
                      value={item.name}
                      onCommit={(name) => renameItem(item.id, name)}
                      className="inline-input inline-input--item"
                      inputStyle={{ fontSize: 15, fontWeight: 700 }}
                    />
                    <button
                      onClick={() => onOpenItem(item.id)}
                      title="Ouvrir la fiche"
                      className="x-btn"
                    >
                      ⤢
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      title="Delete item"
                      className="x-btn"
                    >
                      ×
                    </button>
                  </div>
                  {board.columns.map((col) => (
                    <div key={col.id} className="mrow">
                      <span className="k">{col.name}</span>
                      <span className="mrow-value">{renderCellEditor(item, col)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <button className="add-btn mobile-add-btn" onClick={() => addItem(group.id)}>
                + Add item
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function InlineEditable({
  value, onCommit, className, inputStyle,
}: { value: string; onCommit: (value: string) => void; className?: string; inputStyle?: React.CSSProperties }) {
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
      className={className}
      style={inputStyle}
    />
  );
}
