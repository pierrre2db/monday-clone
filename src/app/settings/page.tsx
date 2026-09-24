import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSession } from "@/lib/session";
import SettingsView from "@/ui/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Same check as src/lib/authz.ts's getSession, adapted for a server component
  // (no Request object here, so we read the cookie via next/headers directly).
  // The API routes (src/app/api/settings/route.ts) enforce admin-only for real —
  // this redirect is UX only, so a non-admin never sees the form flash by.
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await readSession(token, process.env.SESSION_SECRET!);
  if (!session.ok || session.role !== "admin") redirect("/");

  return (
    <div className="wrap">
      <SettingsView />
    </div>
  );
}
