import { prisma } from "@/lib/db";

export const listMembers = () => prisma.member.findMany({ orderBy: { name: "asc" } });
export const createMember = (name: string, avatarColor: string) =>
  prisma.member.create({ data: { name, avatarColor } });
