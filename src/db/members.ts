import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const ROLES = ["admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

function assertRole(role: string): asserts role is Role {
  if (!ROLES.includes(role as Role)) {
    throw new Error(`Invalid role: ${role}. Must be one of ${ROLES.join(", ")}`);
  }
}

// Fields safe to return from any API/UI-facing call — never includes passwordHash.
const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  avatarColor: true,
} satisfies Prisma.MemberSelect;

export type SafeMember = Prisma.MemberGetPayload<{ select: typeof SAFE_SELECT }>;

export const listMembers = (): Promise<SafeMember[]> =>
  prisma.member.findMany({ select: SAFE_SELECT, orderBy: { name: "asc" } });

// Includes passwordHash — for login/authentication use only. Never expose the
// result of this call from an API route or render it in the UI.
export const getMemberByEmail = (email: string) =>
  prisma.member.findUnique({ where: { email } });

export const getMemberById = (id: string): Promise<SafeMember | null> =>
  prisma.member.findUnique({ where: { id }, select: SAFE_SELECT });

export const countMembers = () => prisma.member.count();

export async function createMember(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
  avatarColor?: string;
}): Promise<SafeMember> {
  const role = input.role ?? "member";
  assertRole(role);
  const passwordHash = hashPassword(input.password);
  try {
    return await prisma.member.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role,
        avatarColor: input.avatarColor ?? "#00c875",
      },
      select: SAFE_SELECT,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`A member with email "${input.email}" already exists.`);
    }
    throw err;
  }
}

export async function updateMember(
  id: string,
  data: { name?: string; role?: string; active?: boolean; avatarColor?: string; password?: string }
): Promise<SafeMember> {
  if (data.role !== undefined) assertRole(data.role);
  const { password, ...rest } = data;
  const updateData: Prisma.MemberUpdateInput = { ...rest };
  if (password) {
    updateData.passwordHash = hashPassword(password);
  }
  return prisma.member.update({ where: { id }, data: updateData, select: SAFE_SELECT });
}

export const deleteMember = (id: string) => prisma.member.delete({ where: { id } });

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
