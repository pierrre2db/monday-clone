# Monday.com Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted, Docker-deployable Monday.com-style work-management app (v1): boards with groups/items/typed columns, and Table + Kanban + Calendar views, behind a single shared password.

**Architecture:** Monolithic Next.js (App Router) app serving both UI and API. PostgreSQL via Prisma. A single shared password gates the whole instance via a signed cookie and middleware. Files stored on a local disk volume. Column values stored as JSON in a `CellValue` table, validated by per-type pure functions in a registry. Deploy with Docker Compose (app + db).

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Prisma + PostgreSQL, `jose` (cookie signing), `@dnd-kit` (drag & drop), Vitest + Testing Library (tests), Docker Compose.

---

## File Structure

```
mondayclone/
  docker-compose.yml            # app + db + volumes
  Dockerfile                    # multi-stage Next.js build
  .env.example
  package.json
  next.config.ts
  vitest.config.ts
  prisma/
    schema.prisma               # all entities
    seed.ts                     # demo board
  src/
    lib/
      db.ts                     # Prisma singleton
      session.ts                # cookie sign/verify (jose)
      columns/
        types.ts                # ColumnType union + value type map
        registry.ts             # validator + default-settings registry
        validators.ts           # per-type validate/normalize (pure)
    app/
      middleware.ts             # NOTE: middleware.ts lives at src/middleware.ts
      login/page.tsx            # password form
      api/
        auth/route.ts           # POST login, DELETE logout
        boards/route.ts         # GET list, POST create
        boards/[id]/route.ts    # GET one (with groups/columns/items/cells), PATCH, DELETE
        groups/route.ts         # POST create
        groups/[id]/route.ts    # PATCH, DELETE
        columns/route.ts        # POST create
        columns/[id]/route.ts   # PATCH, DELETE
        items/route.ts          # POST create
        items/[id]/route.ts     # PATCH (name/group/position), DELETE
        cells/route.ts          # PUT set cell value
        upload/route.ts         # POST file, GET file
        members/route.ts        # GET list, POST create
      board/[id]/page.tsx       # board shell (server component)
    db/                         # query modules (thin wrappers over Prisma)
      boards.ts groups.ts columns.ts items.ts cells.ts members.ts
    ui/
      board/
        BoardShell.tsx          # client shell, holds board state + view switch
        ViewSwitcher.tsx
        TableView.tsx
        KanbanView.tsx
        CalendarView.tsx
        cells/
          registry.tsx          # type -> { Renderer, Editor }
          TextCell.tsx StatusCell.tsx PersonCell.tsx DateCell.tsx
          NumberCell.tsx DropdownCell.tsx CheckboxCell.tsx
          TimelineCell.tsx FilesCell.tsx LinkCell.tsx TagsCell.tsx
  src middleware note: Next.js requires middleware at src/middleware.ts (not app/).
```

**Rule:** UI and API never call Prisma directly — they call `src/db/*` query modules. `src/db/*` and API validate cell values via `src/lib/columns/registry.ts`.

---

## Task 1: Project scaffold + Docker Compose

**Files:**
- Create: `mondayclone/package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`
- Create: `Dockerfile`, `docker-compose.yml`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Init project**

Run:
```bash
mkdir -p mondayclone && cd mondayclone
git init
npx create-next-app@latest . --typescript --app --no-tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack
```
Expected: Next.js app scaffolded under `src/`.

- [ ] **Step 2: Add runtime deps**

Run:
```bash
npm i @prisma/client jose @dnd-kit/core @dnd-kit/sortable
npm i -D prisma vitest @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react
```

- [ ] **Step 3: Create `.env.example`**

```bash
DATABASE_URL="postgresql://monday:monday@localhost:5432/monday?schema=public"
APP_PASSWORD="change-me"
SESSION_SECRET="please-generate-a-long-random-string"
UPLOAD_DIR="/data/uploads"
MAX_UPLOAD_BYTES="10485760"
```

- [ ] **Step 4: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: monday
      POSTGRES_PASSWORD: monday
      POSTGRES_DB: monday
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U monday"]
      interval: 5s
      timeout: 5s
      retries: 5
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://monday:monday@db:5432/monday?schema=public
      APP_PASSWORD: ${APP_PASSWORD:-change-me}
      SESSION_SECRET: ${SESSION_SECRET:-dev-secret-change-me}
      UPLOAD_DIR: /data/uploads
      MAX_UPLOAD_BYTES: "10485760"
    ports:
      - "3000:3000"
    volumes:
      - uploads:/data/uploads
volumes:
  pgdata:
  uploads:
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app, Docker Compose, env template"
```

---

## Task 2: Prisma schema + DB singleton + migration

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Board {
  id          String   @id @default(cuid())
  name        String
  description String   @default("")
  createdAt   DateTime @default(now())
  groups      Group[]
  columns     Column[]
  items       Item[]
}

model Group {
  id       String @id @default(cuid())
  boardId  String
  name     String
  color    String @default("#579bfc")
  position Int
  board    Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  items    Item[]
  @@index([boardId])
}

model Column {
  id       String @id @default(cuid())
  boardId  String
  name     String
  type     String
  settings Json   @default("{}")
  position Int
  board    Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cells    CellValue[]
  @@index([boardId])
}

model Item {
  id        String   @id @default(cuid())
  boardId   String
  groupId   String
  name      String
  position  Int
  createdAt DateTime @default(now())
  board     Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  group     Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  cells     CellValue[]
  @@index([boardId])
  @@index([groupId])
}

model CellValue {
  id       String @id @default(cuid())
  itemId   String
  columnId String
  value    Json
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  column   Column @relation(fields: [columnId], references: [id], onDelete: Cascade)
  @@unique([itemId, columnId])
  @@index([columnId])
}

model Member {
  id          String @id @default(cuid())
  name        String
  avatarColor String @default("#00c875")
}
```

- [ ] **Step 2: Write `src/lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Create initial migration**

Run (needs local Postgres from compose `db` service up, or `docker compose up -d db`):
```bash
npx prisma migrate dev --name init
```
Expected: migration created under `prisma/migrations/`, client generated.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: prisma schema, db singleton, initial migration"
```

---

## Task 3: Column types + value validators (pure, TDD)

**Files:**
- Create: `src/lib/columns/types.ts`, `src/lib/columns/validators.ts`, `src/lib/columns/registry.ts`
- Test: `src/lib/columns/validators.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write `src/lib/columns/types.ts`**

```typescript
export const COLUMN_TYPES = [
  "text", "status", "person", "date", "number",
  "dropdown", "checkbox", "timeline", "files", "link", "tags",
] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export type StatusLabel = { id: string; label: string; color: string };
export type DropdownOption = { id: string; label: string };
export type FileRef = { id: string; name: string; size: number };
```

- [ ] **Step 3: Write the failing test `src/lib/columns/validators.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { validateCellValue, defaultSettings } from "./registry";

describe("validateCellValue", () => {
  it("text: keeps a string", () => {
    expect(validateCellValue("text", {}, { text: "hi" })).toEqual({ text: "hi" });
  });
  it("text: coerces empty", () => {
    expect(validateCellValue("text", {}, {})).toEqual({ text: "" });
  });
  it("number: null passes, string rejected", () => {
    expect(validateCellValue("number", {}, { number: 3 })).toEqual({ number: 3 });
    expect(() => validateCellValue("number", {}, { number: "x" })).toThrow();
  });
  it("checkbox: coerces to boolean", () => {
    expect(validateCellValue("checkbox", {}, { checked: true })).toEqual({ checked: true });
    expect(validateCellValue("checkbox", {}, {})).toEqual({ checked: false });
  });
  it("status: rejects unknown labelId", () => {
    const settings = defaultSettings("status");
    const good = (settings.labels as { id: string }[])[0].id;
    expect(validateCellValue("status", settings, { labelId: good })).toEqual({ labelId: good });
    expect(() => validateCellValue("status", settings, { labelId: "nope" })).toThrow();
  });
  it("date: validates ISO date or null", () => {
    expect(validateCellValue("date", {}, { date: "2026-01-02" })).toEqual({ date: "2026-01-02" });
    expect(validateCellValue("date", {}, { date: null })).toEqual({ date: null });
    expect(() => validateCellValue("date", {}, { date: "nope" })).toThrow();
  });
  it("timeline: start<=end or null", () => {
    expect(validateCellValue("timeline", {}, { start: "2026-01-01", end: "2026-01-05" }))
      .toEqual({ start: "2026-01-01", end: "2026-01-05" });
    expect(() => validateCellValue("timeline", {}, { start: "2026-01-05", end: "2026-01-01" })).toThrow();
  });
  it("link: requires url", () => {
    expect(validateCellValue("link", {}, { url: "https://x.com", label: "X" }))
      .toEqual({ url: "https://x.com", label: "X" });
    expect(() => validateCellValue("link", {}, { url: "not a url" })).toThrow();
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test -- validators`
Expected: FAIL (`registry` module not found / functions undefined).

- [ ] **Step 5: Write `src/lib/columns/validators.ts`**

```typescript
import type { ColumnType, StatusLabel, DropdownOption, FileRef } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function assert(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }
function isIsoDate(v: unknown): v is string { return typeof v === "string" && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)); }

type Settings = Record<string, unknown>;
type Value = Record<string, unknown>;

export const validators: Record<ColumnType, (s: Settings, v: Value) => Value> = {
  text: (_s, v) => ({ text: typeof v.text === "string" ? v.text : "" }),
  number: (_s, v) => {
    if (v.number === null || v.number === undefined) return { number: null };
    assert(typeof v.number === "number" && !Number.isNaN(v.number), "number must be a number or null");
    return { number: v.number };
  },
  checkbox: (_s, v) => ({ checked: v.checked === true }),
  status: (s, v) => {
    const labels = (s.labels as StatusLabel[]) ?? [];
    if (v.labelId === null || v.labelId === undefined) return { labelId: null };
    assert(labels.some((l) => l.id === v.labelId), "unknown status labelId");
    return { labelId: v.labelId };
  },
  dropdown: (s, v) => {
    const opts = (s.options as DropdownOption[]) ?? [];
    const ids = Array.isArray(v.optionIds) ? (v.optionIds as string[]) : [];
    ids.forEach((id) => assert(opts.some((o) => o.id === id), "unknown dropdown optionId"));
    return { optionIds: ids };
  },
  person: (_s, v) => ({ memberIds: Array.isArray(v.memberIds) ? (v.memberIds as string[]) : [] }),
  date: (_s, v) => {
    if (v.date === null || v.date === undefined) return { date: null };
    assert(isIsoDate(v.date), "date must be YYYY-MM-DD or null");
    return { date: v.date };
  },
  timeline: (_s, v) => {
    if (v.start === null || v.start === undefined) return { start: null, end: null };
    assert(isIsoDate(v.start) && isIsoDate(v.end), "timeline needs start and end dates");
    assert((v.start as string) <= (v.end as string), "timeline start must be <= end");
    return { start: v.start, end: v.end };
  },
  files: (_s, v) => {
    const files = Array.isArray(v.files) ? (v.files as FileRef[]) : [];
    files.forEach((f) => assert(typeof f.id === "string" && typeof f.name === "string", "invalid file ref"));
    return { files };
  },
  link: (_s, v) => {
    assert(typeof v.url === "string", "link requires url");
    try { new URL(v.url as string); } catch { throw new Error("link url is invalid"); }
    return { url: v.url, label: typeof v.label === "string" ? v.label : (v.url as string) };
  },
  tags: (_s, v) => ({ tags: Array.isArray(v.tags) ? (v.tags as string[]).filter((t) => typeof t === "string") : [] }),
};

export const defaults: Record<ColumnType, () => Settings> = {
  text: () => ({}),
  number: () => ({}),
  checkbox: () => ({}),
  person: () => ({}),
  date: () => ({}),
  timeline: () => ({}),
  files: () => ({}),
  link: () => ({}),
  tags: () => ({}),
  status: () => ({ labels: [
    { id: "s1", label: "Working on it", color: "#fdab3d" },
    { id: "s2", label: "Stuck", color: "#e2445c" },
    { id: "s3", label: "Done", color: "#00c875" },
  ] }),
  dropdown: () => ({ options: [
    { id: "o1", label: "Low" }, { id: "o2", label: "Medium" }, { id: "o3", label: "High" },
  ] }),
};

export function emptyValue(type: ColumnType): Value {
  return validators[type](defaults[type](), {});
}
```

- [ ] **Step 6: Write `src/lib/columns/registry.ts`**

```typescript
import { COLUMN_TYPES, type ColumnType } from "./types";
import { validators, defaults, emptyValue } from "./validators";

export function isColumnType(v: string): v is ColumnType {
  return (COLUMN_TYPES as readonly string[]).includes(v);
}
export function validateCellValue(type: ColumnType, settings: Record<string, unknown>, value: Record<string, unknown>) {
  return validators[type](settings ?? {}, value ?? {});
}
export function defaultSettings(type: ColumnType) {
  return defaults[type]();
}
export { emptyValue };
```

- [ ] **Step 7: Run test, verify pass**

Run: `npm test -- validators`
Expected: PASS (all cases).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: column types + value validators with tests"
```

---

## Task 4: Session helper + auth middleware + login (TDD on session)

**Files:**
- Create: `src/lib/session.ts`, `src/middleware.ts`, `src/app/api/auth/route.ts`, `src/app/login/page.tsx`
- Test: `src/lib/session.test.ts`

- [ ] **Step 1: Write failing test `src/lib/session.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

describe("session", () => {
  it("round-trips a signed token", async () => {
    const token = await signSession("secret-key-secret-key-secret-key");
    expect(await verifySession(token, "secret-key-secret-key-secret-key")).toBe(true);
  });
  it("rejects wrong secret", async () => {
    const token = await signSession("secret-key-secret-key-secret-key");
    expect(await verifySession(token, "different-secret-different-secret")).toBe(false);
  });
  it("rejects garbage", async () => {
    expect(await verifySession("garbage", "secret-key-secret-key-secret-key")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- session`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/session.ts`**

```typescript
import { SignJWT, jwtVerify } from "jose";

const enc = (secret: string) => new TextEncoder().encode(secret);
export const SESSION_COOKIE = "monday_session";

export async function signSession(secret: string): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}
export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, enc(secret));
    return payload.ok === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- session`
Expected: PASS.

- [ ] **Step 5: Write `src/middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET!);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

- [ ] **Step 6: Write `src/app/api/auth/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  const token = await signSession(process.env.SESSION_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 7: Write `src/app/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/");
    else setError("Wrong password");
  }
  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: "15vh auto", display: "grid", gap: 12 }}>
      <h1>Sign in</h1>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoFocus />
      <button type="submit">Enter</button>
      {error && <p style={{ color: "#e2445c" }}>{error}</p>}
    </form>
  );
}
```

- [ ] **Step 8: Manual verify**

Run: `docker compose up -d db && npm run dev`
Visit `http://localhost:3000` → redirected to `/login`. Wrong password → error. Correct `APP_PASSWORD` → redirected to `/`.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: single-password auth (session helper, middleware, login)"
```

---

## Task 5: DB query modules

**Files:**
- Create: `src/db/boards.ts`, `groups.ts`, `columns.ts`, `items.ts`, `cells.ts`, `members.ts`
- Test: `src/db/cells.test.ts` (integration, needs test DB)

- [ ] **Step 1: Write `src/db/boards.ts`**

```typescript
import { prisma } from "@/lib/db";

export const listBoards = () => prisma.board.findMany({ orderBy: { createdAt: "asc" } });
export const createBoard = (name: string) => prisma.board.create({ data: { name } });
export const deleteBoard = (id: string) => prisma.board.delete({ where: { id } });
export const renameBoard = (id: string, name: string) => prisma.board.update({ where: { id }, data: { name } });

export function getBoardFull(id: string) {
  return prisma.board.findUnique({
    where: { id },
    include: {
      groups: { orderBy: { position: "asc" } },
      columns: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" }, include: { cells: true } },
    },
  });
}
```

- [ ] **Step 2: Write `src/db/groups.ts`**

```typescript
import { prisma } from "@/lib/db";

export async function createGroup(boardId: string, name: string) {
  const count = await prisma.group.count({ where: { boardId } });
  return prisma.group.create({ data: { boardId, name, position: count } });
}
export const updateGroup = (id: string, data: { name?: string; color?: string; position?: number }) =>
  prisma.group.update({ where: { id }, data });
export const deleteGroup = (id: string) => prisma.group.delete({ where: { id } });
```

- [ ] **Step 3: Write `src/db/columns.ts`**

```typescript
import { prisma } from "@/lib/db";
import { defaultSettings } from "@/lib/columns/registry";
import type { ColumnType } from "@/lib/columns/types";

export async function createColumn(boardId: string, name: string, type: ColumnType) {
  const count = await prisma.column.count({ where: { boardId } });
  return prisma.column.create({
    data: { boardId, name, type, position: count, settings: defaultSettings(type) as object },
  });
}
export const updateColumn = (id: string, data: { name?: string; settings?: object; position?: number }) =>
  prisma.column.update({ where: { id }, data });
export const deleteColumn = (id: string) => prisma.column.delete({ where: { id } });
```

- [ ] **Step 4: Write `src/db/items.ts`**

```typescript
import { prisma } from "@/lib/db";

export async function createItem(boardId: string, groupId: string, name: string) {
  const count = await prisma.item.count({ where: { groupId } });
  return prisma.item.create({ data: { boardId, groupId, name, position: count } });
}
export const updateItem = (id: string, data: { name?: string; groupId?: string; position?: number }) =>
  prisma.item.update({ where: { id }, data });
export const deleteItem = (id: string) => prisma.item.delete({ where: { id } });
```

- [ ] **Step 5: Write `src/db/cells.ts`**

```typescript
import { prisma } from "@/lib/db";
import { validateCellValue } from "@/lib/columns/registry";
import type { ColumnType } from "@/lib/columns/types";

export async function setCell(itemId: string, columnId: string, rawValue: Record<string, unknown>) {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) throw new Error("column not found");
  const value = validateCellValue(
    column.type as ColumnType,
    (column.settings as Record<string, unknown>) ?? {},
    rawValue,
  );
  return prisma.cellValue.upsert({
    where: { itemId_columnId: { itemId, columnId } },
    create: { itemId, columnId, value },
    update: { value },
  });
}
```

- [ ] **Step 6: Write `src/db/members.ts`**

```typescript
import { prisma } from "@/lib/db";
export const listMembers = () => prisma.member.findMany({ orderBy: { name: "asc" } });
export const createMember = (name: string, avatarColor: string) =>
  prisma.member.create({ data: { name, avatarColor } });
```

- [ ] **Step 7: Write integration test `src/db/cells.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createBoard, deleteBoard } from "./boards";
import { createGroup } from "./groups";
import { createColumn } from "./columns";
import { createItem } from "./items";
import { setCell } from "./cells";

let boardId: string;
beforeAll(async () => { boardId = (await createBoard("t")).id; });
afterAll(async () => { await deleteBoard(boardId); await prisma.$disconnect(); });

describe("setCell", () => {
  it("validates against the column type", async () => {
    const group = await createGroup(boardId, "g");
    const col = await createColumn(boardId, "num", "number");
    const item = await createItem(boardId, group.id, "i");
    const saved = await setCell(item.id, col.id, { number: 5 });
    expect(saved.value).toEqual({ number: 5 });
    await expect(setCell(item.id, col.id, { number: "x" })).rejects.toThrow();
  });
});
```

- [ ] **Step 8: Run integration test**

Run: `docker compose up -d db && npx prisma migrate deploy && npm test -- cells.test`
Expected: PASS. (Requires `DATABASE_URL` in `.env` pointing at the compose `db`.)

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: db query modules with cell validation + integration test"
```

---

## Task 6: Core API routes (boards, groups, columns, items, cells, members)

**Files:**
- Create: `src/app/api/boards/route.ts`, `boards/[id]/route.ts`, `groups/route.ts`, `groups/[id]/route.ts`, `columns/route.ts`, `columns/[id]/route.ts`, `items/route.ts`, `items/[id]/route.ts`, `cells/route.ts`, `members/route.ts`

- [ ] **Step 1: Boards routes**

`src/app/api/boards/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { listBoards, createBoard } from "@/db/boards";

export async function GET() { return NextResponse.json(await listBoards()); }
export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createBoard(name.trim()), { status: 201 });
}
```

`src/app/api/boards/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getBoardFull, deleteBoard, renameBoard } from "@/db/boards";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoardFull(id);
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(board);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  return NextResponse.json(await renameBoard(id, name));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteBoard(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Groups routes**

`src/app/api/groups/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createGroup } from "@/db/groups";
export async function POST(req: Request) {
  const { boardId, name } = await req.json();
  return NextResponse.json(await createGroup(boardId, name ?? "New group"), { status: 201 });
}
```

`src/app/api/groups/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { updateGroup, deleteGroup } from "@/db/groups";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateGroup(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Columns routes**

`src/app/api/columns/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createColumn } from "@/db/columns";
import { isColumnType } from "@/lib/columns/registry";
export async function POST(req: Request) {
  const { boardId, name, type } = await req.json();
  if (!isColumnType(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
  return NextResponse.json(await createColumn(boardId, name ?? "New column", type), { status: 201 });
}
```

`src/app/api/columns/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { updateColumn, deleteColumn } from "@/db/columns";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateColumn(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteColumn(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Items routes**

`src/app/api/items/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createItem } from "@/db/items";
export async function POST(req: Request) {
  const { boardId, groupId, name } = await req.json();
  return NextResponse.json(await createItem(boardId, groupId, name ?? "New item"), { status: 201 });
}
```

`src/app/api/items/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { updateItem, deleteItem } from "@/db/items";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await updateItem(id, await req.json()));
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Cells route**

`src/app/api/cells/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { setCell } from "@/db/cells";
export async function PUT(req: Request) {
  const { itemId, columnId, value } = await req.json();
  try {
    return NextResponse.json(await setCell(itemId, columnId, value ?? {}));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 6: Members route**

`src/app/api/members/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { listMembers, createMember } from "@/db/members";
const COLORS = ["#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ff642e"];
export async function GET() { return NextResponse.json(await listMembers()); }
export async function POST(req: Request) {
  const { name } = await req.json();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return NextResponse.json(await createMember(name ?? "New member", color), { status: 201 });
}
```

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`, then (after logging in in a browser, copy the cookie or use the app UI later). Quick check with the running dev server:
```bash
curl -s -X POST localhost:3000/api/boards -H 'content-type: application/json' -d '{"name":"Demo"}'
```
Expected: 401 (auth middleware) — confirms the gate works. Full CRUD verified via UI in later tasks.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: core REST API routes for boards/groups/columns/items/cells/members"
```

---

## Task 7: Board shell + client data layer + Table view

**Files:**
- Create: `src/app/board/[id]/page.tsx`, `src/app/page.tsx` (board list)
- Create: `src/ui/board/BoardShell.tsx`, `ViewSwitcher.tsx`, `TableView.tsx`
- Create: `src/ui/board/types.ts` (shared client types), `src/ui/board/api.ts` (fetch helpers)
- Create: `src/ui/board/cells/registry.tsx` and cell components (see Task 8; stub-import here)

- [ ] **Step 1: Shared client types `src/ui/board/types.ts`**

```typescript
import type { ColumnType } from "@/lib/columns/types";

export type Cell = { id: string; itemId: string; columnId: string; value: Record<string, unknown> };
export type Item = { id: string; groupId: string; name: string; position: number; cells: Cell[] };
export type Group = { id: string; name: string; color: string; position: number };
export type Column = { id: string; name: string; type: ColumnType; settings: Record<string, unknown>; position: number };
export type BoardFull = {
  id: string; name: string; description: string;
  groups: Group[]; columns: Column[]; items: Item[];
};
export type Member = { id: string; name: string; avatarColor: string };
```

- [ ] **Step 2: Fetch helpers `src/ui/board/api.ts`**

```typescript
async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}
export const api = {
  setCell: (itemId: string, columnId: string, value: Record<string, unknown>) =>
    fetch("/api/cells", { method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, columnId, value }) }).then(json),
  addItem: (boardId: string, groupId: string) =>
    fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId, groupId, name: "New item" }) }).then(json),
  addGroup: (boardId: string) =>
    fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId }) }).then(json),
  addColumn: (boardId: string, type: string) =>
    fetch("/api/columns", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId, type, name: type }) }).then(json),
  updateItem: (id: string, data: object) =>
    fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
};
```

- [ ] **Step 3: Board list `src/app/page.tsx`**

```tsx
import Link from "next/link";
import { listBoards } from "@/db/boards";

export const dynamic = "force-dynamic";
export default async function Home() {
  const boards = await listBoards();
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Boards</h1>
      <ul>{boards.map((b) => <li key={b.id}><Link href={`/board/${b.id}`}>{b.name}</Link></li>)}</ul>
      <form action="/api/boards" method="post" />
      <NewBoard />
    </main>
  );
}

function NewBoard() {
  return null; // replaced by client button below if desired; boards can be seeded via Task 10
}
```

(Board creation is exercised by the seed script in Task 10 and can be added as a client button later; not required for v1 core.)

- [ ] **Step 4: Board page `src/app/board/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getBoardFull } from "@/db/boards";
import { listMembers } from "@/db/members";
import BoardShell from "@/ui/board/BoardShell";
import type { BoardFull, Member } from "@/ui/board/types";

export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoardFull(id);
  if (!board) notFound();
  const members = await listMembers();
  return <BoardShell initialBoard={board as unknown as BoardFull} members={members as Member[]} />;
}
```

- [ ] **Step 5: `src/ui/board/ViewSwitcher.tsx`**

```tsx
"use client";
export type ViewKind = "table" | "kanban" | "calendar";
export default function ViewSwitcher({ value, onChange }: { value: ViewKind; onChange: (v: ViewKind) => void }) {
  const kinds: ViewKind[] = ["table", "kanban", "calendar"];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {kinds.map((k) => (
        <button key={k} onClick={() => onChange(k)}
          style={{ fontWeight: value === k ? 700 : 400, textTransform: "capitalize" }}>{k}</button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: `src/ui/board/BoardShell.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { BoardFull, Member } from "./types";
import ViewSwitcher, { type ViewKind } from "./ViewSwitcher";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import { api } from "./api";

export default function BoardShell({ initialBoard, members }: { initialBoard: BoardFull; members: Member[] }) {
  const [board, setBoard] = useState<BoardFull>(initialBoard);
  const [view, setView] = useState<ViewKind>("table");

  function setCellLocal(itemId: string, columnId: string, value: Record<string, unknown>) {
    setBoard((b) => ({
      ...b,
      items: b.items.map((it) => it.id !== itemId ? it : {
        ...it,
        cells: it.cells.some((c) => c.columnId === columnId)
          ? it.cells.map((c) => c.columnId === columnId ? { ...c, value } : c)
          : [...it.cells, { id: `tmp-${columnId}`, itemId, columnId, value }],
      }),
    }));
  }
  async function saveCell(itemId: string, columnId: string, value: Record<string, unknown>) {
    const prev = board;
    setCellLocal(itemId, columnId, value);
    try { await api.setCell(itemId, columnId, value); }
    catch (e) { setBoard(prev); alert((e as Error).message); }
  }
  async function addItem(groupId: string) {
    const created = await api.addItem(board.id, groupId) as { id: string; name: string; position: number };
    setBoard((b) => ({ ...b, items: [...b.items, { ...created, groupId, cells: [] }] }));
  }

  const shared = { board, members, saveCell, addItem };
  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>{board.name}</h1>
      <ViewSwitcher value={view} onChange={setView} />
      {view === "table" && <TableView {...shared} />}
      {view === "kanban" && <KanbanView {...shared} />}
      {view === "calendar" && <CalendarView board={board} />}
    </main>
  );
}
```

- [ ] **Step 7: `src/ui/board/TableView.tsx`**

```tsx
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
```

- [ ] **Step 8: Manual verify (after Task 8 + seed)**

Deferred: Table renders once cell components (Task 8) and a seeded board (Task 10) exist.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: board shell, table view, client data layer"
```

---

## Task 8: Cell renderers/editors registry (all column types)

**Files:**
- Create: `src/ui/board/cells/registry.tsx` and one component file per type.
- Test: `src/ui/board/cells/TextCell.test.tsx`

Each editor has the interface:
```typescript
type EditorProps = {
  column: { id: string; type: string; settings: Record<string, unknown> };
  members: { id: string; name: string; avatarColor: string }[];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
};
```

- [ ] **Step 1: Write failing test `src/ui/board/cells/TextCell.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextEditor } from "./TextCell";

describe("TextEditor", () => {
  it("calls onChange with new text on blur", () => {
    const onChange = vi.fn();
    render(<TextEditor column={{ id: "c", type: "text", settings: {} }} members={[]} value={{ text: "a" }} onChange={onChange} />);
    const input = screen.getByDisplayValue("a");
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ text: "b" });
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- TextCell`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/ui/board/cells/TextCell.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TextEditor({ value, onChange }: EditorProps) {
  const [v, setV] = useState((value.text as string) ?? "");
  return <input value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ text: v })} style={{ width: "100%", border: "none" }} />;
}
```

- [ ] **Step 4: Write `NumberCell`, `CheckboxCell`, `LinkCell`, `TagsCell`**

`NumberCell.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function NumberEditor({ value, onChange }: EditorProps) {
  const [v, setV] = useState(value.number == null ? "" : String(value.number));
  return <input type="number" value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ number: v === "" ? null : Number(v) })} style={{ width: "100%", border: "none" }} />;
}
```

`CheckboxCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
export function CheckboxEditor({ value, onChange }: EditorProps) {
  return <input type="checkbox" checked={value.checked === true}
    onChange={(e) => onChange({ checked: e.target.checked })} />;
}
```

`LinkCell.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function LinkEditor({ value, onChange }: EditorProps) {
  const [url, setUrl] = useState((value.url as string) ?? "");
  return <input value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)}
    onBlur={() => url && onChange({ url, label: url })} style={{ width: "100%", border: "none" }} />;
}
```

`TagsCell.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TagsEditor({ value, onChange }: EditorProps) {
  const tags = (value.tags as string[]) ?? [];
  const [v, setV] = useState(tags.join(", "));
  return <input value={v} onChange={(e) => setV(e.target.value)}
    onBlur={() => onChange({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
    style={{ width: "100%", border: "none" }} />;
}
```

- [ ] **Step 5: Write `DateCell`, `TimelineCell`**

`DateCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
export function DateEditor({ value, onChange }: EditorProps) {
  return <input type="date" value={(value.date as string) ?? ""}
    onChange={(e) => onChange({ date: e.target.value || null })} style={{ border: "none" }} />;
}
```

`TimelineCell.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { EditorProps } from "./registry";
export function TimelineEditor({ value, onChange }: EditorProps) {
  const [start, setStart] = useState((value.start as string) ?? "");
  const [end, setEnd] = useState((value.end as string) ?? "");
  function commit(s: string, e: string) { if (s && e) onChange({ start: s, end: e }); else onChange({ start: null, end: null }); }
  return (
    <span style={{ display: "flex", gap: 4 }}>
      <input type="date" value={start} onChange={(e) => { setStart(e.target.value); commit(e.target.value, end); }} />
      <input type="date" value={end} onChange={(e) => { setEnd(e.target.value); commit(start, e.target.value); }} />
    </span>
  );
}
```

- [ ] **Step 6: Write `StatusCell`, `DropdownCell`**

`StatusCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
import type { StatusLabel } from "@/lib/columns/types";
export function StatusEditor({ column, value, onChange }: EditorProps) {
  const labels = (column.settings.labels as StatusLabel[]) ?? [];
  const current = labels.find((l) => l.id === value.labelId);
  return (
    <select value={(value.labelId as string) ?? ""} onChange={(e) => onChange({ labelId: e.target.value || null })}
      style={{ background: current?.color ?? "#c4c4c4", color: "#fff", border: "none", padding: "4px" }}>
      <option value="">—</option>
      {labels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  );
}
```

`DropdownCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
import type { DropdownOption } from "@/lib/columns/types";
export function DropdownEditor({ column, value, onChange }: EditorProps) {
  const options = (column.settings.options as DropdownOption[]) ?? [];
  const selected = (value.optionIds as string[]) ?? [];
  return (
    <select multiple value={selected}
      onChange={(e) => onChange({ optionIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
```

- [ ] **Step 7: Write `PersonCell`**

`PersonCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
export function PersonEditor({ members, value, onChange }: EditorProps) {
  const selected = (value.memberIds as string[]) ?? [];
  return (
    <select multiple value={selected}
      onChange={(e) => onChange({ memberIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}
```

- [ ] **Step 8: Write `FilesCell` (upload)**

`FilesCell.tsx`:
```tsx
"use client";
import type { EditorProps } from "./registry";
import type { FileRef } from "@/lib/columns/types";
export function FilesEditor({ value, onChange }: EditorProps) {
  const files = (value.files as FileRef[]) ?? [];
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) { alert("upload failed"); return; }
    const ref = (await res.json()) as FileRef;
    onChange({ files: [...files, ref] });
  }
  return (
    <span>
      {files.map((f) => <a key={f.id} href={`/api/upload?id=${f.id}`} style={{ marginRight: 6 }}>{f.name}</a>)}
      <input type="file" onChange={upload} />
    </span>
  );
}
```

- [ ] **Step 9: Write registry `src/ui/board/cells/registry.tsx`**

```tsx
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
```

- [ ] **Step 10: Run test, verify pass**

Run: `npm test -- TextCell`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: cell editor registry for all column types"
```

---

## Task 9: File upload API + storage volume

**Files:**
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Write `src/app/api/upload/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const DIR = process.env.UPLOAD_DIR ?? "/data/uploads";
const MAX = Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760);

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "file too large" }, { status: 413 });
  const id = randomUUID() + extname(file.name);
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, id), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ id, name: file.name, size: file.size });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.includes("/") || id.includes("..")) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const path = join(DIR, id);
  try {
    await stat(path);
    const buf = await readFile(path);
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/octet-stream", "content-disposition": `inline; filename="${id}"` } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, log in, add a `files` column, upload a small file. Confirm it appears as a link and downloads. Confirm a >10MB file is rejected.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: file upload/download API with size limit and path guard"
```

---

## Task 10: Demo seed script

**Files:**
- Create: `prisma/seed.ts`; add `prisma.seed` config + `db:seed` script to `package.json`

- [ ] **Step 1: Write `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import { defaultSettings } from "../src/lib/columns/registry";
const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.member.create({ data: { name: "Alice", avatarColor: "#00c875" } });
  await prisma.member.create({ data: { name: "Bob", avatarColor: "#579bfc" } });

  const board = await prisma.board.create({ data: { name: "Product Roadmap" } });
  const [todo, doing] = await Promise.all([
    prisma.group.create({ data: { boardId: board.id, name: "To do", color: "#579bfc", position: 0 } }),
    prisma.group.create({ data: { boardId: board.id, name: "In progress", color: "#fdab3d", position: 1 } }),
  ]);
  const status = await prisma.column.create({ data: { boardId: board.id, name: "Status", type: "status", position: 0, settings: defaultSettings("status") as object } });
  const owner = await prisma.column.create({ data: { boardId: board.id, name: "Owner", type: "person", position: 1, settings: {} } });
  const due = await prisma.column.create({ data: { boardId: board.id, name: "Due", type: "date", position: 2, settings: {} } });

  const item = await prisma.item.create({ data: { boardId: board.id, groupId: todo.id, name: "Design login", position: 0 } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: status.id, value: { labelId: "s1" } } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: owner.id, value: { memberIds: [alice.id] } } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: due.id, value: { date: "2026-10-01" } } });
  await prisma.item.create({ data: { boardId: board.id, groupId: doing.id, name: "Build API", position: 0 } });
  console.log("Seeded board:", board.id);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Wire seed in `package.json`**

Add:
```json
"prisma": { "seed": "npx tsx prisma/seed.ts" },
"scripts": { "db:seed": "npx tsx prisma/seed.ts" }
```
Run: `npm i -D tsx`

- [ ] **Step 3: Run seed + verify Table view**

Run:
```bash
docker compose up -d db && npx prisma migrate deploy && npm run db:seed && npm run dev
```
Log in, open the board → Table view shows groups, status/person/date editors working. Edit a cell → persists on reload.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: demo seed script"
```

---

## Task 11: Kanban view

**Files:**
- Create: `src/ui/board/KanbanView.tsx`

- [ ] **Step 1: Write `src/ui/board/KanbanView.tsx`**

```tsx
"use client";
import { useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
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
  const { setNodeRef, isOver } = useDroppable(lane.id);
  return (
    <div ref={setNodeRef} style={{ minWidth: 200, background: isOver ? "#eef" : "#f5f6f8", padding: 8, borderRadius: 8 }}>
      <h4 style={{ color: lane.color }}>{lane.label}</h4>
      {itemNames.map((i) => <Card key={i.id} id={i.id} name={i.name} />)}
    </div>
  );
}
```

Note: import `useDroppable` and define `Card` (draggable) — see Step 2.

- [ ] **Step 2: Add drag primitives to the same file (top imports + Card)**

At the top of `KanbanView.tsx` add:
```tsx
import { useDroppable, useDraggable } from "@dnd-kit/core";
```
And add at the bottom:
```tsx
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
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`, open seeded board → Kanban. Drag "Design login" between lanes → status updates and persists on reload.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: kanban view with drag-to-change-status"
```

---

## Task 12: Calendar view

**Files:**
- Create: `src/ui/board/CalendarView.tsx`

- [ ] **Step 1: Write `src/ui/board/CalendarView.tsx`**

```tsx
"use client";
import { useMemo, useState } from "react";
import type { BoardFull } from "./types";

export default function CalendarView({ board }: { board: BoardFull }) {
  const dateCols = board.columns.filter((c) => c.type === "date" || c.type === "timeline");
  const [colId, setColId] = useState(dateCols[0]?.id ?? "");
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const col = board.columns.find((c) => c.id === colId);

  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!col) return map;
    for (const it of board.items) {
      const v = it.cells.find((c) => c.columnId === col.id)?.value as { date?: string; start?: string } | undefined;
      const day = v?.date ?? v?.start;
      if (day) { const arr = map.get(day) ?? []; arr.push(it.name); map.set(day, arr); }
    }
    return map;
  }, [board, col]);

  if (!col) return <p>Add a Date or Timeline column to use Calendar.</p>;
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function iso(day: number) { return `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function shift(delta: number) { const d = new Date(month.y, month.m + delta, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => shift(-1)}>‹</button>
        <strong>{first.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
        <button onClick={() => shift(1)}>›</button>
        {dateCols.length > 1 && (
          <select value={colId} onChange={(e) => setColId(e.target.value)}>
            {dateCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} style={{ fontWeight: 700 }}>{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} style={{ minHeight: 72, border: "1px solid #e6e9ef", padding: 4, background: day ? "#fff" : "#fafafa" }}>
            {day && <div style={{ fontSize: 12, color: "#888" }}>{day}</div>}
            {day && (byDay.get(iso(day)) ?? []).map((name, j) => (
              <div key={j} style={{ fontSize: 12, background: "#579bfc", color: "#fff", borderRadius: 4, padding: "1px 4px", marginTop: 2 }}>{name}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, open seeded board → Calendar. "Design login" (due 2026-10-01) appears on Oct 1. Month nav works.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: calendar view by date/timeline column"
```

---

## Task 13: Board toolbar (add group/column/item + member management)

**Files:**
- Modify: `src/ui/board/BoardShell.tsx` (add toolbar + handlers)
- Create: `src/ui/board/Toolbar.tsx`

- [ ] **Step 1: Write `src/ui/board/Toolbar.tsx`**

```tsx
"use client";
import { COLUMN_TYPES } from "@/lib/columns/types";
export default function Toolbar({ onAddColumn, onAddGroup }: { onAddColumn: (type: string) => void; onAddGroup: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button onClick={onAddGroup}>+ Group</button>
      <select defaultValue="" onChange={(e) => { if (e.target.value) { onAddColumn(e.target.value); e.target.value = ""; } }}>
        <option value="">+ Column…</option>
        {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Wire handlers in `BoardShell.tsx`**

Add inside `BoardShell` (after `addItem`):
```tsx
async function addGroup() {
  const g = await api.addGroup(board.id) as { id: string; name: string; color: string; position: number };
  setBoard((b) => ({ ...b, groups: [...b.groups, g] }));
}
async function addColumn(type: string) {
  const c = await api.addColumn(board.id, type) as { id: string; name: string; type: never; settings: Record<string, unknown>; position: number };
  setBoard((b) => ({ ...b, columns: [...b.columns, c] }));
}
```
And render `<Toolbar onAddColumn={addColumn} onAddGroup={addGroup} />` under `<ViewSwitcher/>`. Import Toolbar at top.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Add a group, add each column type, add an item, edit cells. All persist on reload.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: board toolbar to add groups/columns"
```

---

## Task 14: Deployment docs + full Docker smoke test

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Monday Clone

Self-hosted work-management app (boards, typed columns, Table/Kanban/Calendar views).

## Run with Docker (VPS or macOS)

```bash
cp .env.example .env   # set APP_PASSWORD and SESSION_SECRET
docker compose up -d --build
docker compose exec app npm run db:seed   # optional demo board
```

Open http://localhost:3000 and sign in with `APP_PASSWORD`.

## Local dev

```bash
docker compose up -d db
cp .env.example .env    # point DATABASE_URL at localhost:5432
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Environment

| Var | Meaning |
| --- | --- |
| DATABASE_URL | Postgres connection string |
| APP_PASSWORD | single shared instance password |
| SESSION_SECRET | cookie signing secret (long random) |
| UPLOAD_DIR | file storage path (default /data/uploads) |
| MAX_UPLOAD_BYTES | max upload size (default 10485760) |

Data persists in Docker volumes `pgdata` and `uploads`.
````

- [ ] **Step 2: Full Docker smoke test**

Run:
```bash
docker compose down -v
docker compose up -d --build
docker compose exec app npm run db:seed
```
Open `http://localhost:3000`, log in, verify Table/Kanban/Calendar on the seeded board, edit cells, upload a file, restart (`docker compose restart`) and confirm data persists.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all validator, session, cell, and TextCell tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: deployment README + verified Docker smoke test"
```

---

## Self-Review Notes

- **Spec coverage:** boards/groups/columns/items (Tasks 2,5,6,7), all 11 column types (Tasks 3,8), Table (7), Kanban (11), Calendar (12), members+person (5,6,8), single-password auth (4), file upload on volume (8,9), Docker Compose VPS/macOS (1,14), validation + optimistic rollback (3,5,7). All spec sections mapped.
- **Deferred (spec "out of scope"):** per-user auth, automations, websockets, dashboards — correctly excluded.
- **Type consistency:** `EditorProps` defined in `cells/registry.tsx`, imported by all cell components; `BoardFull`/`Item`/`Cell` shared from `ui/board/types.ts`; cell value shapes match validator outputs in Task 3.
- **Known simplifications for v1 (acceptable):** row/group drag-reorder in Table is deferred (Kanban covers drag); column rename/settings editing UI deferred (defaults + seed cover it); board-create button deferred to seed. These are additive and do not block the core experience.
