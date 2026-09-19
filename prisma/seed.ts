import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { defaultSettings } from "../src/lib/columns/registry";
import { hashPassword } from "../src/lib/password";

// Prisma 7 requires a driver adapter to be passed explicitly (the schema's
// `datasource.url` is no longer read by the client at runtime).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
  const admin = await prisma.member.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      avatarColor: "#e2445c",
    },
  });
  const alice = await prisma.member.create({
    data: {
      name: "Alice",
      email: "alice@example.com",
      passwordHash: hashPassword("alice"),
      role: "member",
      avatarColor: "#00c875",
    },
  });
  await prisma.member.create({
    data: {
      name: "Bob",
      email: "bob@example.com",
      passwordHash: hashPassword("bob"),
      role: "viewer",
      avatarColor: "#579bfc",
    },
  });

  const board = await prisma.board.create({ data: { name: "Product Roadmap" } });
  const [todo, doing] = await Promise.all([
    prisma.group.create({ data: { boardId: board.id, name: "To do", color: "#579bfc", position: 0 } }),
    prisma.group.create({ data: { boardId: board.id, name: "In progress", color: "#fdab3d", position: 1 } }),
  ]);
  const status = await prisma.column.create({ data: { boardId: board.id, name: "Status", type: "status", position: 0, settings: defaultSettings("status") as object } });
  const owner = await prisma.column.create({ data: { boardId: board.id, name: "Owner", type: "person", position: 1, settings: {} } });
  const due = await prisma.column.create({ data: { boardId: board.id, name: "Due", type: "date", position: 2, settings: {} } });

  const item = await prisma.item.create({ data: { boardId: board.id, groupId: todo.id, name: "Design login", position: 0 } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: status.id, value: { labelId: "s1" } } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: owner.id, value: { memberIds: [alice.id] } } });
  await prisma.cellValue.create({ data: { itemId: item.id, columnId: due.id, value: { date: "2026-10-01" } } });
  await prisma.item.create({ data: { boardId: board.id, groupId: doing.id, name: "Build API", position: 0 } });
  console.log("Seeded board:", board.id);
  console.log(`Seeded accounts: admin=${admin.email} (role admin), alice@example.com (member), bob@example.com (viewer).`);
  console.log("Passwords are the seed defaults (admin/alice/bob unless ADMIN_PASSWORD overrides the admin one) — change them before any real use.");
}
main().finally(() => prisma.$disconnect());
