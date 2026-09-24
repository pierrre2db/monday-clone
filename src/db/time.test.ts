// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createBoard, deleteBoard } from "./boards";
import { createGroup } from "./groups";
import { createItem } from "./items";
import { createMember, deleteMember } from "./members";
import { addTime, listMemberTime, listItemTime, getTimeEntry, deleteTime } from "./time";

let boardId: string;
let groupId: string;
let itemId: string;
let memberId: string;

beforeAll(async () => {
  boardId = (await createBoard("time-test-board")).id;
  groupId = (await createGroup(boardId, "g")).id;
  itemId = (await createItem(boardId, groupId, "i")).id;
  memberId = (
    await createMember({
      name: "Time Tester",
      email: `time-tester-${Date.now()}@example.com`,
      password: "password123",
    })
  ).id;
});

afterAll(async () => {
  await deleteMember(memberId);
  await deleteBoard(boardId);
  await prisma.$disconnect();
});

describe("addTime", () => {
  it("inserts a valid entry", async () => {
    const row = await addTime({ itemId, memberId, minutes: 90, date: "2026-09-20", note: "worked" });
    expect(row.minutes).toBe(90);
    expect(row.date).toBe("2026-09-20");
    expect(row.itemId).toBe(itemId);
    expect(row.memberId).toBe(memberId);
    await deleteTime(row.id);
  });

  it("rejects invalid minutes", async () => {
    await expect(addTime({ itemId, memberId, minutes: 0, date: "2026-09-20" })).rejects.toThrow();
    await expect(addTime({ itemId, memberId, minutes: 2000, date: "2026-09-20" })).rejects.toThrow();
    await expect(addTime({ itemId, memberId, minutes: 1.5, date: "2026-09-20" })).rejects.toThrow();
  });

  it("rejects invalid dates", async () => {
    await expect(addTime({ itemId, memberId, minutes: 10, date: "2026-13-40" })).rejects.toThrow();
    await expect(addTime({ itemId, memberId, minutes: 10, date: "nope" })).rejects.toThrow();
  });
});

describe("listItemTime", () => {
  it("returns entries with member name, newest first", async () => {
    const a = await addTime({ itemId, memberId, minutes: 15, date: "2026-09-18" });
    const b = await addTime({ itemId, memberId, minutes: 20, date: "2026-09-19" });
    const rows = await listItemTime(itemId);
    expect(rows[0].id).toBe(b.id);
    expect(rows[1].id).toBe(a.id);
    expect(rows[0].memberName).toBe("Time Tester");
    await deleteTime(a.id);
    await deleteTime(b.id);
  });
});

describe("listMemberTime", () => {
  it("filters by date range and sums minutes", async () => {
    const inRange1 = await addTime({ itemId, memberId, minutes: 30, date: "2026-09-10" });
    const inRange2 = await addTime({ itemId, memberId, minutes: 45, date: "2026-09-12" });
    const outOfRange = await addTime({ itemId, memberId, minutes: 60, date: "2026-09-25" });

    const rows = await listMemberTime(memberId, "2026-09-10", "2026-09-12");
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([inRange1.id, inRange2.id].sort());
    const total = rows.reduce((sum, r) => sum + r.minutes, 0);
    expect(total).toBe(75);

    await deleteTime(inRange1.id);
    await deleteTime(inRange2.id);
    await deleteTime(outOfRange.id);
  });
});

describe("getTimeEntry / deleteTime", () => {
  it("round-trips a row and then deletes it", async () => {
    const created = await addTime({ itemId, memberId, minutes: 5, date: "2026-09-01" });
    const fetched = await getTimeEntry(created.id);
    expect(fetched?.id).toBe(created.id);
    await deleteTime(created.id);
    expect(await getTimeEntry(created.id)).toBeNull();
  });
});
