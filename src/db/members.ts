import { prisma } from "@/lib/db";

export const listMembers = () => prisma.member.findMany({ orderBy: { name: "asc" } });
export const createMember = (name: string, avatarColor: string) =>
  prisma.member.create({ data: { name, avatarColor } });
export const deleteMember = (id: string) => prisma.member.delete({ where: { id } });
export const updateMember = (id: string, data: { name?: string; avatarColor?: string }) =>
  prisma.member.update({ where: { id }, data });

export const deleteMemberAndUnassign = (id: string) =>
  prisma.$transaction(async (tx) => {
    const personColumns = await tx.column.findMany({ where: { type: "person" } });
    const columnIds = personColumns.map((c) => c.id);
    if (columnIds.length > 0) {
      const cells = await tx.cellValue.findMany({ where: { columnId: { in: columnIds } } });
      for (const cell of cells) {
        const value = cell.value as { memberIds?: string[] } | null;
        if (value && Array.isArray(value.memberIds) && value.memberIds.includes(id)) {
          await tx.cellValue.update({
            where: { id: cell.id },
            data: { value: { ...value, memberIds: value.memberIds.filter((m) => m !== id) } },
          });
        }
      }
    }
    return tx.member.delete({ where: { id } });
  });
