import { getSession } from "./authz";

export async function isAdmin(req: Request): Promise<boolean> {
  const session = await getSession(req);
  return session?.role === "admin";
}
