import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Standalone (like prisma/seed.ts): runs on every container start via the
// Dockerfile CMD, so it must be idempotent and side-effect-free once any
// member exists. It intentionally does NOT import src/lib/password.ts — that
// file is TypeScript, and this script is invoked with plain `node`, which
// cannot import .ts files. The hashing logic below is a duplicate of
// src/lib/password.ts's hashPassword; keep the two in sync if either changes.
function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.member.count();
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (count === 0 && ADMIN_EMAIL && ADMIN_PASSWORD) {
    const admin = await prisma.member.create({
      data: {
        name: ADMIN_NAME || "Admin",
        email: ADMIN_EMAIL,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        role: "admin",
      },
    });
    console.log(`Bootstrapped admin ${admin.email}`);
  } else {
    console.log("Bootstrap skipped (users exist or env missing)");
  }
}

main().finally(() => prisma.$disconnect());
