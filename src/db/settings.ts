import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DailyCheck = { enabled: boolean; targetHours: number };
export type Smtp = { host: string; port: number; user: string; from: string; secure: boolean; pass?: string };
export type SmtpSafe = { host: string; port: number; user: string; from: string; secure: boolean; passSet: boolean };

export const DAILY_CHECK_DEFAULT: DailyCheck = { enabled: false, targetHours: 8 };
export const SMTP_DEFAULT: Smtp = { host: "", port: 587, user: "", from: "", secure: false };

export async function getDailyCheck(): Promise<DailyCheck> {
  const row = await prisma.setting.findUnique({ where: { key: "dailyCheck" } });
  const value = (row?.value as Partial<DailyCheck>) ?? {};
  return { ...DAILY_CHECK_DEFAULT, ...value };
}

export async function setDailyCheck(v: { enabled: boolean; targetHours: number }): Promise<DailyCheck> {
  if (typeof v.enabled !== "boolean") throw new Error("enabled must be a boolean");
  if (typeof v.targetHours !== "number" || Number.isNaN(v.targetHours) || v.targetHours < 0 || v.targetHours > 24) {
    throw new Error("targetHours must be a number between 0 and 24");
  }
  const next: DailyCheck = { enabled: v.enabled, targetHours: v.targetHours };
  await prisma.setting.upsert({
    where: { key: "dailyCheck" },
    create: { key: "dailyCheck", value: next as Prisma.InputJsonValue },
    update: { value: next as Prisma.InputJsonValue },
  });
  return next;
}

// Internal only — includes the SMTP password. Never expose from an API route.
export async function getSmtpRaw(): Promise<Smtp> {
  const row = await prisma.setting.findUnique({ where: { key: "smtp" } });
  const value = (row?.value as Partial<Smtp>) ?? {};
  return { ...SMTP_DEFAULT, ...value };
}

export async function getSmtpSafe(): Promise<SmtpSafe> {
  const raw = await getSmtpRaw();
  const { pass, ...safe } = raw;
  return { ...safe, passSet: !!pass };
}

export async function setSmtp(partial: Partial<Smtp>): Promise<SmtpSafe> {
  const current = await getSmtpRaw();

  const host = partial.host !== undefined ? partial.host : current.host;
  const user = partial.user !== undefined ? partial.user : current.user;
  const from = partial.from !== undefined ? partial.from : current.from;
  const secure = partial.secure !== undefined ? partial.secure : current.secure;
  const port = partial.port !== undefined ? partial.port : current.port;

  if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be an integer between 1 and 65535");
  }

  // Write-only password: preserve the existing one when the incoming value is empty/undefined.
  const pass = partial.pass ? partial.pass : current.pass;

  const next: Smtp = { host, port, user, from, secure, pass };
  await prisma.setting.upsert({
    where: { key: "smtp" },
    create: { key: "smtp", value: next as Prisma.InputJsonValue },
    update: { value: next as Prisma.InputJsonValue },
  });
  const { pass: _pass, ...safe } = next;
  return { ...safe, passSet: !!pass };
}
