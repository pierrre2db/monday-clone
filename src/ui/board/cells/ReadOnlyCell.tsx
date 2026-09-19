import type { EditorProps } from "./registry";
import type { StatusLabel, DropdownOption, FileRef } from "@/lib/columns/types";
import { StatusChip } from "@/ui/kit/Chip";
import { Pill } from "@/ui/kit/Pill";
import { AvatarStack } from "@/ui/kit/Avatar";
import { colorForId } from "@/ui/kit/colors";

type ReadOnlyProps = Omit<EditorProps, "onChange">;

function Muted() {
  return <span className="cell-trigger-muted">—</span>;
}

/**
 * Display-only rendering of a cell value, for viewers (and any other
 * !canEdit context). Never renders an input, popover trigger, or upload
 * control — just the value using the same kit display components the rest
 * of the app already uses for read-only chrome (StatusChip/Pill/AvatarStack).
 */
export function ReadOnlyCell({ column, members, value }: ReadOnlyProps) {
  switch (column.type) {
    case "text": {
      const t = (value.text as string) ?? "";
      return t ? <span>{t}</span> : <Muted />;
    }
    case "number": {
      const n = value.number as number | null | undefined;
      return n == null ? <Muted /> : <span>{String(n)}</span>;
    }
    case "checkbox":
      return <input type="checkbox" className="cell-checkbox" checked={value.checked === true} disabled readOnly />;
    case "link": {
      const url = (value.url as string) ?? "";
      const label = (value.label as string) || url;
      return url ? (
        <a href={url} target="_blank" rel="noreferrer">{label}</a>
      ) : <Muted />;
    }
    case "tags": {
      const tags = (value.tags as string[]) ?? [];
      return tags.length > 0 ? <span>{tags.join(", ")}</span> : <Muted />;
    }
    case "date": {
      const d = value.date as string | undefined;
      return d ? <span>{d}</span> : <Muted />;
    }
    case "timeline": {
      const start = value.start as string | undefined;
      const end = value.end as string | undefined;
      return start && end ? <span>{start} → {end}</span> : <Muted />;
    }
    case "status": {
      const labels = (column.settings.labels as StatusLabel[]) ?? [];
      const current = labels.find((l) => l.id === value.labelId);
      return current ? <StatusChip label={current.label} color={current.color} /> : <StatusChip label="—" />;
    }
    case "dropdown": {
      const options = (column.settings.options as DropdownOption[]) ?? [];
      const selected = (value.optionIds as string[]) ?? [];
      const selectedOptions = options.filter((o) => selected.includes(o.id));
      return selectedOptions.length > 0 ? (
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
          {selectedOptions.map((o) => <Pill key={o.id} label={o.label} color={colorForId(o.id)} />)}
        </span>
      ) : <Muted />;
    }
    case "person": {
      const selected = (value.memberIds as string[]) ?? [];
      const selectedMembers = members.filter((m) => selected.includes(m.id));
      return selectedMembers.length > 0 ? (
        <AvatarStack members={selectedMembers.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }))} size={26} />
      ) : <Muted />;
    }
    case "files": {
      const files = (value.files as FileRef[]) ?? [];
      return files.length > 0 ? (
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 0 }}>
          {files.map((f) => (
            <a key={f.id} href={`/api/upload?id=${f.id}`} className="cell-file-chip">{f.name}</a>
          ))}
        </span>
      ) : <Muted />;
    }
    default:
      return <Muted />;
  }
}

export default ReadOnlyCell;
