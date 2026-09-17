// @vitest-environment node
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
