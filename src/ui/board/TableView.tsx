"use client";
import type { BoardFull, Member } from "./types";
import { cellRegistry } from "./cells/registry";

type Props = {
  board: BoardFull; members: Member[];
  saveCell: (itemId: string, columnId: string, value: Record<string, unknown>) => void;
  addItem: (groupId: string) => void;
};
export default function TableView({ board, members, saveCell, addItem }: Props) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {board.groups.map((group) => {
        const items = board.items.filter((i) => i.groupId === group.id);
        return (
          <section key={group.id}>
            <h3 style={{ color: group.color }}>{group.name}</h3>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={cellTh}>Item</th>
                  {board.columns.map((c) => <th key={c.id} style={cellTh}>{c.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellTd}>{item.name}</td>
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
const cellTh: React.CSSProperties = { border: "1px solid #e6e9ef", padding: "6px 10px", textAlign: "left", background: "#f5f6f8" };
const cellTd: React.CSSProperties = { border: "1px solid #e6e9ef", padding: "4px 8px" };
