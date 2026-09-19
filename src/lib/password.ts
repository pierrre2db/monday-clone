import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Password hashing using scrypt (Node's built-in, no extra dependency).
// Stored format: "<saltHex>:<hashHex>".
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [s, h] = stored.split(":");
  if (!s || !h) return false;
  const hash = Buffer.from(h, "hex");
  const test = scryptSync(pw, Buffer.from(s, "hex"), 64);
  return hash.length === test.length && timingSafeEqual(hash, test);
}
