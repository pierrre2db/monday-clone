"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { formatMinutes } from "./time";

// Slim, unobtrusive reminder of today's logged time vs. the admin-configured
// daily target — see src/ui/settings/SettingsView.tsx for where it's set.
// Renders nothing when the check is disabled or the viewer can't log time.
export default function DailyHoursBanner({ canLog }: { canLog: boolean }) {
  const [state, setState] = useState<{ enabled: boolean; targetHours: number; totalMinutes: number } | null>(null);

  useEffect(() => {
    if (!canLog) return;
    let cancelled = false;
    api.getPublicSettings()
      .then((pub) => {
        if (cancelled || !pub.dailyCheck.enabled) return;
        return api.myTimeToday().then((t) => {
          if (cancelled) return;
          setState({ enabled: true, targetHours: pub.dailyCheck.targetHours, totalMinutes: t.totalMinutes });
        });
      })
      .catch(() => {
        // Silent — a broken settings/time fetch shouldn't block the board.
      });
    return () => {
      cancelled = true;
    };
  }, [canLog]);

  if (!canLog || !state || !state.enabled) return null;

  const targetMinutes = state.targetHours * 60;
  const met = state.totalMinutes >= targetMinutes;

  return (
    <div className={`daily-banner ${met ? "daily-banner--ok" : "daily-banner--warn"}`}>
      Aujourd&apos;hui : {formatMinutes(state.totalMinutes)} / {state.targetHours}h
      {met ? " — ✓ objectif atteint" : " — pensez à enregistrer votre temps"}
    </div>
  );
}
