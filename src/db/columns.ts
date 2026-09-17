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
