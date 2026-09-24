// Formats a duration in minutes as a short human string, e.g. 90 -> "1h 30min",
// 45 -> "45min", 120 -> "2h". Used by the item ticket panel's time-tracking section.
export function formatMinutes(min: number): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
