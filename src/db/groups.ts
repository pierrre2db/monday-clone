import { prisma } from "@/lib/db";

export async function createGroup(boardId: string, name: string) {
  const count = await prisma.group.count({ where: { boardId } });
  return prisma.group.create({ data: { boardId, name, position: count } });
}
export const updateGroup = (id: string, data: { name?: string; color?: string; position?: number }) =>
  prisma.group.update({ where: { id }, data });
export const deleteGroup = (id: string) => prisma.group.delete({ where: { id } });
