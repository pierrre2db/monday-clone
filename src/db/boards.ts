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
