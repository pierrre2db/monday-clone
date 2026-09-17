"use client";
import type { EditorProps } from "./registry";
import Popover from "@/ui/kit/Popover";
import { Avatar, AvatarStack } from "@/ui/kit/Avatar";

export function PersonEditor({ members, value, onChange }: EditorProps) {
  const selected = (value.memberIds as string[]) ?? [];
  const selectedMembers = members.filter((m) => selected.includes(m.id));

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((mid) => mid !== id)
      : [...selected, id];
    onChange({ memberIds: next });
  }

  return (
    <Popover
      trigger={({ toggle: open }) => (
        <button type="button" className="cell-trigger" onClick={open}>
          {selectedMembers.length > 0 ? (
            <AvatarStack members={selectedMembers.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }))} size={26} />
          ) : (
            <span className="cell-trigger-muted">+ Assigner</span>
          )}
        </button>
      )}
    >
      {() => (
        <div style={{ display: "grid", gap: 2, minWidth: 180 }}>
          {members.map((m) => {
            const isSelected = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className="cell-option-row"
                onClick={() => toggle(m.id)}
              >
                <Avatar name={m.name} color={m.avatarColor} size={22} />
                <span style={{ flex: 1 }}>{m.name}</span>
                {isSelected && <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
