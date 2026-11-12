// Formatting helpers. Icelandic names are spelled out here instead of
// using Intl, so the server and every browser produce exactly the same
// text (no hydration mismatches).
// Iceland is UTC+0 all year, so UTC timestamps are local time.

const WEEKDAYS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];
const WEEKDAYS_SHORT = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
const MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];

/** 1425 -> "1.425 kr." */
export function formatPrice(isk: number | null | undefined): string | null {
  if (isk == null || isk <= 0) return null;
  return `${String(isk).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} kr.`;
}

/** "2026-11-09T20:30:00Z" -> "20:30" */
export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** "2026-11-09T..." -> "mánudagur 9. nóvember" */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-11-11T20:00:00Z" -> "í dag" / "á morgun" / "mið. 11. nóv." */
export function formatDay(iso: string, now = new Date()): string {
  const offset = dayOffset(iso, now);
  if (offset === 0) return "í dag";
  if (offset === 1) return "á morgun";
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}. ${d.getUTCDate()}. ${MONTHS_SHORT[d.getUTCMonth()]}.`;
}

/** Heading for a day in a list: "Í dag", "Á morgun", "Fimmtudagur 12. nóvember". */
export function formatDayHeading(iso: string, now = new Date()): string {
  const offset = dayOffset(iso, now);
  if (offset === 0) return "Í dag";
  if (offset === 1) return "Á morgun";
  const long = formatLongDate(iso);
  return long.charAt(0).toUpperCase() + long.slice(1);
}

/** Calendar-block parts: { weekday: "mið", day: "11", month: "nóv" } */
export function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: WEEKDAYS_SHORT[d.getUTCDay()],
    day: String(d.getUTCDate()),
    month: MONTHS_SHORT[d.getUTCMonth()],
  };
}

/** Whole days between `now` and `iso` (0 = today). */
function dayOffset(iso: string, now: Date): number {
  const day = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((day - today) / 86_400_000);
}
