import { prisma } from "@/lib/db";

export async function createItem(boardId: string, groupId: string, name: string) {
  const count = await prisma.item.count({ where: { groupId } });
  return prisma.item.create({ data: { boardId, groupId, name, position: count } });
}
export const updateItem = (id: string, data: { name?: string; groupId?: string; position?: number }) =>
  prisma.item.update({ where: { id }, data });
export const deleteItem = (id: string) => prisma.item.delete({ where: { id } });
