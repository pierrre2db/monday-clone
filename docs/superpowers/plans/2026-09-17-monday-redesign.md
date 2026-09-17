# Monday Clone v1.2 — UI Redesign Implementation Plan

> Implement task-by-task, commit per task. Verify build + responsive (375px + desktop, light + dark) each UI task.

**Goal:** Replace the raw v1 UI with a polished, Monday-like, responsive design: design tokens + light/dark, reusable UI primitives (Button, StatusChip, Avatar, Pill, Popover), styled cell editors (chips/avatars replacing native `<select multiple>`), and responsive Table (stacked cards on mobile) / Kanban (horizontal snap scroll) / Calendar (agenda list on mobile).

**Design source of truth:** the approved mockup at `docs/superpowers/specs/board-redesign-mockup.html` (copied from the published artifact). Reuse its CSS token values and component looks (Inter font, pill status chips, avatar stacks, rounded cards, soft shadows, sticky first column, dark mode via `prefers-color-scheme` + `[data-theme]`).

**Stack:** unchanged — Next.js 16, React 19, TypeScript, inline styles + a shared `globals.css` for tokens. NO Tailwind, NO new build step. New client-only components in `src/ui/kit/`. All behavior (handlers, API, optimistic updates) stays identical — this is a visual refactor only.

**Env:** Docker prod app on host port 4000 (don't disturb). Other app on 3000 (don't touch). Postgres localhost:5432. Test with `PORT=3005 npm run dev`. 13 tests must stay green.

---

## Token reference (put in globals.css `:root`)

```css
--font: 'Inter', system-ui, -apple-system, sans-serif;
--bg:#f6f7fb; --surface:#fff; --surface-2:#f1f2f6; --border:#e4e7ee;
--text:#1c1f26; --text-muted:#6b7280;
--shadow:0 1px 2px rgba(20,23,38,.04),0 4px 16px rgba(20,23,38,.06);
--shadow-lg:0 8px 30px rgba(20,23,38,.12);
--radius:14px; --radius-sm:9px; --accent:#6c5ce7;
--c-blue:#4b8bff; --c-orange:#fdab3d; --c-red:#e74c6b; --c-green:#00c875;
--c-purple:#a25ddc; --c-teal:#00b8a3; --c-gray:#c3c8d4;
```
Dark: redefine bg/surface/surface-2/border/text/text-muted/shadows under `@media (prefers-color-scheme:dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` (values from the mockup dark block).

---

## Task 1: Foundation — tokens, font, theme, UI kit primitives

**Files:**
- Copy mockup: `docs/superpowers/specs/board-redesign-mockup.html` (from scratchpad `board-redesign.html`)
- Modify: `src/app/globals.css` (replace scaffold CSS with tokens + base styles)
- Modify: `src/app/layout.tsx` (load Inter via `next/font/google`, set `<html lang="fr">`, apply font class, body bg)
- Create: `src/ui/kit/Button.tsx`, `Chip.tsx` (StatusChip), `Avatar.tsx` (Avatar + AvatarStack), `Pill.tsx`, `Popover.tsx`, `ThemeToggle.tsx`
- Create: `src/ui/kit/colors.ts` (palette array + `colorForId(id)` helper to map a status/member id to a stable palette color)

- [ ] Step 1: `globals.css` — tokens (light + dark per above), `*{box-sizing:border-box}`, body `{margin:0;background:var(--bg);color:var(--text);font-family:var(--font)}`, sensible defaults for `button`/`input`/`select` (inherit font). Remove scaffold's default page styles.
- [ ] Step 2: `layout.tsx` — `import { Inter } from "next/font/google"`, `const inter = Inter({ subsets:["latin"], variable:"--font-inter" })`, put `className={inter.className}` on `<html>` or body, keep metadata. Ensure viewport is default responsive (Next adds it; add explicit `export const viewport = { width: "device-width", initialScale: 1 }` if missing).
- [ ] Step 3: `Popover.tsx` — a client component: renders a trigger (children as trigger via render-prop or a `trigger` prop) + an absolutely-positioned panel; opens on click, closes on click-outside (document mousedown listener) and Escape; `role="dialog"`. Keep it dependency-free. Signature suggestion:
  `Popover({ trigger, children, align? }: { trigger: (o:{open:boolean;toggle:()=>void})=>ReactNode; children: (o:{close:()=>void})=>ReactNode; align?: "left"|"right" })`.
- [ ] Step 4: `Chip.tsx` — `StatusChip({ label, color })` → the pill from the mockup (`.chip`). `Avatar.tsx` — `Avatar({ name, color, size? })` (round, initials) + `AvatarStack({ members }: { members:{id,name,avatarColor}[] })` (overlapping, `.ava`). `Pill.tsx` — bordered priority/tag pill. `Button.tsx` — token-styled button (variants: default, ghost, danger). `ThemeToggle.tsx` — 🌙/☀️ toggling `document.documentElement[data-theme]` with localStorage (wrapped in try/catch), same logic as the mockup script.
- [ ] Step 5: `colors.ts` — `export const PALETTE = ["#4b8bff","#fdab3d","#e74c6b","#00c875","#a25ddc","#00b8a3"]` and `export function colorForId(id:string){ let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))>>>0; return PALETTE[h%PALETTE.length]; }` (stable per-id color for members/avatars).
- [ ] Step 6: `npx tsc --noEmit` clean, `npm test` 13 passing, `npm run build` succeeds. Commit `feat(ui): design tokens, Inter font, dark mode, UI kit primitives`.

---

## Task 2: Restyle cell editors with the kit

**Files:** Modify all under `src/ui/board/cells/`.

Keep each editor's `EditorProps` and `onChange` payload EXACTLY the same (validators unchanged). Only change presentation.

- [ ] Step 1: `StatusCell.tsx` — replace the native colored `<select>` with a `StatusChip` (current label + color from settings, or a muted "—") that opens a `Popover` listing the labels as clickable rows (colored dot + name) + a "Clear" row; clicking a label calls `onChange({ labelId })`.
- [ ] Step 2: `PersonCell.tsx` — replace `<select multiple>` with an `AvatarStack` of selected members (or a muted "+ Assign") that opens a `Popover` with a checklist of members (avatar + name + check); toggling calls `onChange({ memberIds })`.
- [ ] Step 3: `DropdownCell.tsx` — replace `<select multiple>` with selected options shown as `Pill`s; Popover checklist of options; `onChange({ optionIds })`.
- [ ] Step 4: `TextCell`, `NumberCell`, `LinkCell`, `TagsCell` — style the inputs (token border on focus, padding, transparent bg, full-width), no behavior change. `DateCell`/`TimelineCell` — style the native date inputs consistently. `CheckboxCell` — a custom rounded checkbox look (accent color) but still a real `<input type=checkbox>` for a11y.
- [ ] Step 5: Verify with `PORT=3005 npm run dev` + browser: on the seed board, status/person/dropdown editors open popovers and persist changes; other editors still save. tsc/tests/build green. Commit `feat(ui): chip/avatar/popover cell editors`.

---

## Task 3: Table view redesign + responsive cards

**Files:** Modify `src/ui/board/TableView.tsx`.

- [ ] Step 1: Wrap each group's table in a `.card` (surface, radius, shadow); uppercase muted `<th>`; row hover; group title with a colored dot + count badge (from the mockup). Keep the Task-2 inline rename inputs and ×/⚙ controls but restyle them (small, muted, appear on hover is a plus but not required).
- [ ] Step 2: Sticky first column: `th/td.sticky { position:sticky; left:0; background:var(--surface) }` and horizontal scroll on the table container for many columns.
- [ ] Step 3: Responsive — at `max-width:640px`, hide the `<table>` (`.desktop-only`) and render a **stacked card per item** (`.cards`/`.mcard`): item name as heading (still rename-editable), each column as a `label / editor` row. Reuse the SAME cell editors from the registry so editing works identically in both layouts. The delete "×" stays available per card.
- [ ] Step 4: Verify at desktop AND 375px (resize the dev browser / use device emulation): no horizontal page overflow at 375px, cards readable, editing works in both. tsc/tests/build green. Commit `feat(ui): table redesign + mobile stacked cards`.

---

## Task 4: Kanban + Calendar redesign + responsive

**Files:** Modify `src/ui/board/KanbanView.tsx`, `src/ui/board/CalendarView.tsx`.

- [ ] Step 1: Kanban — style lanes (`.lane` surface-2, radius) with header (colored dot + name + count), cards (`.kcard` surface, shadow) showing item name + a small meta row (priority pill / avatar stack if such columns exist; otherwise just the name). Horizontal container: `overflow-x:auto; scroll-snap-type:x mandatory`; lanes `flex:0 0 250px; scroll-snap-align:start`. Keep dnd-kit drag working. On mobile the same horizontal snap works; ensure lanes are a touch-friendly width.
- [ ] Step 2: Calendar — style the month grid (rounded container, muted weekday headers, today highlight, item chips using status color when available). At `max-width:640px`, switch to an **agenda list**: a vertical list of upcoming dated items grouped by day (date + item chips) instead of the 7-col grid. Keep the month nav + column selector.
- [ ] Step 3: Verify desktop + 375px, light + dark. Kanban drag still updates status. tsc/tests/build green. Commit `feat(ui): kanban + calendar redesign + responsive`.

---

## Task 5: Shell, home, toolbar, panels restyle

**Files:** Modify `src/ui/board/BoardShell.tsx`, `ViewSwitcher.tsx`, `Toolbar.tsx`, `ColumnSettings.tsx`, `MembersPanel.tsx`, `src/ui/home/HomeBoards.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`.

- [ ] Step 1: BoardShell — board header with gradient emoji tile + title + subtitle (groups/items count); mount `ThemeToggle` in a top bar; `ViewSwitcher` as segmented pill tabs (from the mockup `.tabs`). Toolbar buttons as kit `Button`s. Keep all handlers.
- [ ] Step 2: Home (`HomeBoards`) — boards as a responsive grid of cards (name + open + delete), a styled "+ New board" input+button. Login page — centered card, kit Button, token styling.
- [ ] Step 3: `ColumnSettings` + `MembersPanel` — render inside the new `Popover`/panel style, kit Buttons, avatar swatches. Behavior unchanged.
- [ ] Step 4: Verify whole app desktop + 375px + light/dark: nav between views, all CRUD still works, no overflow. tsc/tests/build green. Commit `feat(ui): shell, home, toolbar, panels restyle`.

---

## Task 6: Docker rebuild + responsive smoke + memory

- [ ] Step 1: `docker compose up -d --build` (host 4000 preserved, no `-v`). App healthy.
- [ ] Step 2: Smoke on :4000 — auth, board renders, switch views, edit a status via popover, add a member; check at a 375px viewport (browser device emulation) that there's no horizontal overflow and Table shows stacked cards. Light + dark.
- [ ] Step 3: `npm test` 13 passing. Commit any Dockerfile change (likely none). Note final state.

---

## Self-Review Notes
- Visual-only refactor: no `EditorProps`, API, or validator changes — cell `onChange` payloads identical, so the 13 tests (validators/session/cells/TextCell) stay valid. If the TextCell test breaks due to markup changes, keep the input's `value`/blur behavior so `getByDisplayValue` + blur still works.
- Popover accessibility: focus not trapped in v1.2 (acceptable), but Escape + click-outside close, and triggers are real buttons.
- Out of scope: drag-reorder rows/columns, image avatars, animations/transitions beyond simple hovers, PWA/offline.
