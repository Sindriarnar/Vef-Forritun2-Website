// Formatting helpers. Run on the server so the HTML is identical for
// every visitor (and there are no hydration mismatches).
// Iceland is UTC+0 all year, so UTC timestamps are local time.

const krona = new Intl.NumberFormat("is-IS");
const dayFormat = new Intl.DateTimeFormat("is-IS", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Atlantic/Reykjavik",
});

/** 1425 -> "1.425 kr." */
export function formatPrice(isk: number | null | undefined): string | null {
  if (isk == null || isk <= 0) return null;
  return `${krona.format(isk)} kr.`;
}

/** "2026-11-09T20:30:00Z" -> "20:30" */
export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** "2026-11-11T20:00:00Z" -> "í dag" / "á morgun" / "mið. 11. nóv." */
export function formatDay(iso: string, now = new Date()): string {
  const day = iso.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  if (day === today) return "í dag";
  if (day === tomorrow) return "á morgun";
  return dayFormat.format(new Date(iso));
}
