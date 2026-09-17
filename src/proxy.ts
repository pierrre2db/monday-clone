import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET!);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
