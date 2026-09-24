import { prisma } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export async function addTime(input: { itemId: string; memberId: string; minutes: number; date: string; note?: string }) {
  const { itemId, memberId, minutes, date, note = "" } = input;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error("minutes must be 1..1440");
  }
  if (!isValidDate(date)) {
    throw new Error("date must be a valid YYYY-MM-DD date");
  }
  return prisma.timeEntry.create({
    data: { itemId, memberId, minutes, date, note },
  });
}

export async function listItemTime(itemId: string) {
  const rows = await prisma.timeEntry.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    include: { member: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    memberId: r.memberId,
    memberName: r.member.name,
    minutes: r.minutes,
    date: r.date,
    note: r.note,
    createdAt: r.createdAt,
  }));
}

export async function listMemberTime(memberId: string, from: string, to: string) {
  const rows = await prisma.timeEntry.findMany({
    where: { memberId, date: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    include: { item: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    itemName: r.item.name,
    memberId: r.memberId,
    minutes: r.minutes,
    date: r.date,
    note: r.note,
    createdAt: r.createdAt,
  }));
}

export const getTimeEntry = (id: string) => prisma.timeEntry.findUnique({ where: { id } });

export const deleteTime = (id: string) => prisma.timeEntry.delete({ where: { id } });
