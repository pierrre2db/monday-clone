import { SESSION_COOKIE, readSession } from "@/lib/session";

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split("; ")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx) === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return undefined;
}

export async function isAdmin(req: Request): Promise<boolean> {
  const token = parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  const { admin } = await readSession(token, process.env.SESSION_SECRET!);
  return admin;
}
