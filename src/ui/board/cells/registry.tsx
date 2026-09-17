import type { ColumnType } from "@/lib/columns/types";
import { TextEditor } from "./TextCell";
import { NumberEditor } from "./NumberCell";
import { CheckboxEditor } from "./CheckboxCell";
import { LinkEditor } from "./LinkCell";
import { TagsEditor } from "./TagsCell";
import { DateEditor } from "./DateCell";
import { TimelineEditor } from "./TimelineCell";
import { StatusEditor } from "./StatusCell";
import { DropdownEditor } from "./DropdownCell";
import { PersonEditor } from "./PersonCell";
import { FilesEditor } from "./FilesCell";

export type EditorProps = {
  column: { id: string; type: string; settings: Record<string, unknown> };
  members: { id: string; name: string; avatarColor: string }[];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
};

export const cellRegistry: Record<ColumnType, { Editor: (p: EditorProps) => React.ReactNode }> = {
  text: { Editor: TextEditor },
  number: { Editor: NumberEditor },
  checkbox: { Editor: CheckboxEditor },
  link: { Editor: LinkEditor },
  tags: { Editor: TagsEditor },
  date: { Editor: DateEditor },
  timeline: { Editor: TimelineEditor },
  status: { Editor: StatusEditor },
  dropdown: { Editor: DropdownEditor },
  person: { Editor: PersonEditor },
  files: { Editor: FilesEditor },
};
