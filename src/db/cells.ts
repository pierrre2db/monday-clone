import { Prisma } from "@prisma/client";
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
  ) as Prisma.InputJsonValue;
  return prisma.cellValue.upsert({
    where: { itemId_columnId: { itemId, columnId } },
    create: { itemId, columnId, value },
    update: { value },
  });
}
