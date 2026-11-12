import type { ScrapedOccurrence } from "../types";

/**
 * Helpers for places with opening hours (pools, happy hours...).
 * A weekly schedule is turned into concrete occurrences for the next few
 * days, so the website can simply ask "what is open today?".
 *
 * Iceland is UTC+0 all year, so local times are UTC times.
 */

/** How many days ahead we generate opening-hour occurrences for. */
export const DAYS_AHEAD = 7;

export interface TimeRange {
  start: string; // "06:30"
  end: string; // "22:00"
}

/** Every "HH:MM–HH:MM" (or "HH.MM - HH.MM", "15:00 til 20:00") in a text. */
export function parseTimeRanges(text: string): TimeRange[] {
  const ranges: TimeRange[] = [];
  const pattern = /(\d{1,2})[:.](\d{2})\s*(?:[–—-]|til)\s*(\d{1,2})[:.](\d{2})/g;
  for (const m of text.matchAll(pattern)) {
    ranges.push({ start: `${m[1].padStart(2, "0")}:${m[2]}`, end: `${m[3].padStart(2, "0")}:${m[4]}` });
  }
  return ranges;
}

/** Today and the following days (as "YYYY-MM-DD"), starting at `now`. */
export function upcomingDates(now: Date, days = DAYS_AHEAD): string[] {
  return Array.from({ length: days }, (_, i) =>
    new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** 0 = Sunday ... 6 = Saturday, like Date.getUTCDay(). */
export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * Icelandic or English weekday name/abbreviation -> 0..6, or null.
 * Accepts "Mán.", "þri", "Fimmtudagur", "mon", "Sat"...
 */
export function parseWeekday(text: string): number | null {
  const key = text.trim().toLowerCase().slice(0, 3);
  const days: Record<string, number> = {
    sun: 0, mán: 1, man: 1, þri: 2, mið: 3, fim: 4, fös: 5, lau: 6,
    mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  return days[key] ?? null;
}

/** Turns time ranges on a given date into occurrences (handles closing after midnight). */
export function rangesToOccurrences(
  date: string,
  ranges: TimeRange[],
  extra: Omit<ScrapedOccurrence, "startsAt" | "endsAt"> = {},
): ScrapedOccurrence[] {
  return ranges.map(({ start, end }) => {
    const startsAt = `${date}T${start}:00Z`;
    let endsAt = `${date}T${end}:00Z`;
    if (end <= start) {
      const next = new Date(new Date(`${date}T00:00:00Z`).getTime() + 86_400_000);
      endsAt = `${next.toISOString().slice(0, 10)}T${end}:00Z`;
    }
    return { startsAt, endsAt, ...extra };
  });
}

const DAY_HOURS = new RegExp(
  "([a-záðéíóúýþæö]{3})[a-záðéíóúýþæö.]*" + // day: "mán", "mánudaga", "fim."
    "\\s*(?:[-–]\\s*([a-záðéíóúýþæö]{3})[a-záðéíóúýþæö.]*)?" + // optional "- fimmtudaga"
    "\\s*[:|]?\\s*" +
    "((?:(?:kl\\.?\\s*)?\\d{1,2}[:.]\\d{2}\\s*(?:til|[-–])\\s*\\d{1,2}[:.]\\d{2}\\s*(?:og\\s*|\\|\\s*)?)+" + // one or more time ranges
    "|opið allan (?:daginn|sólarhringinn))", // or "open all day"
  "gi",
);

/** "Opið allan daginn": stored as one slot from midnight to midnight. */
export const ALL_DAY: TimeRange = { start: "00:00", end: "00:00" };

/**
 * Weekly opening hours written as text, e.g.
 *   "Opnunartími Keila Mánudaga - fimmtudaga kl.16:00 - 22:00 Föstudaga kl.16:00 - 00:00 ..."
 *   "Fimmtudagur 12:30-14:30 17:00-19:00"
 *   "Keila Mán - Sun Opið allan daginn"
 * -> occurrences for the coming days.
 *
 * Only the text after `marker` is read (the first occurrence that is
 * followed by day + time text, since the word may also appear in menus),
 * up to `stopAt` if given, e.g. so a sports bar's hours on the same page
 * don't override the bowling alley's.
 */
export function parseWeeklyHours(
  text: string,
  options: { marker: string; stopAt?: string; now: Date; venue: string; maxLength?: number },
): ScrapedOccurrence[] {
  const lower = text.toLowerCase();
  const maxLength = options.maxLength ?? 400;
  let matches: RegExpMatchArray[] = [];

  for (let at = lower.indexOf(options.marker); at !== -1 && matches.length === 0; at = lower.indexOf(options.marker, at + 1)) {
    let section = lower.slice(at, at + maxLength);
    if (options.stopAt) {
      const stop = section.indexOf(options.stopAt, options.marker.length);
      if (stop !== -1) section = section.slice(0, stop);
    }
    matches = [...section.matchAll(DAY_HOURS)].filter((m) => parseWeekday(m[1]) !== null);
  }

  const byDay = new Map<number, TimeRange[]>();
  for (const m of matches) {
    const from = parseWeekday(m[1])!;
    const to = m[2] ? parseWeekday(m[2]) : from;
    if (to === null) continue;
    const ranges = m[3].startsWith("opið allan") ? [ALL_DAY] : parseTimeRanges(m[3]);
    // Walk from `from` to `to` (Mon-Thu = 1,2,3,4; wraps past Sunday if needed).
    for (let d = from, i = 0; i < 7; d = (d + 1) % 7, i++) {
      if (!byDay.has(d)) byDay.set(d, ranges); // first mention wins (pages often repeat the table)
      if (d === to) break;
    }
  }

  return upcomingDates(options.now).flatMap((date) =>
    rangesToOccurrences(date, byDay.get(weekday(date)) ?? [], { venue: options.venue }),
  );
}

/** "Hagasmára 1, 201 Kópavogi" / "Múlavegur 1, 104 Reykjavík" from free text. */
export function findAddress(text: string): string | null {
  return text.match(/[A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+ \d+[a-z]?, \d{3} [A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+/)?.[0] ?? null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maí: 5, mai: 5, jún: 6, jun: 6,
  júl: 7, jul: 7, ágú: 8, agu: 8, sep: 9, okt: 10, nóv: 11, nov: 11, des: 12,
};

/**
 * "24. desember" / "1. janúar - Nýársdagur 2027" -> "YYYY-MM-DD".
 * When the text has no year, picks the year that puts the date closest
 * to `now` (so in December, "1. janúar" means next year).
 */
export function parseIcelandicDate(text: string, now: Date): string | null {
  const m = text.toLowerCase().match(/(\d{1,2})\.\s*([a-záéíóúýþæöð]+)/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3)];
  if (!month) return null;
  const day = Number(m[1]);
  const pad = (n: number) => String(n).padStart(2, "0");

  const explicitYear = text.match(/\b(20\d{2})\b/)?.[1];
  const candidates = explicitYear
    ? [Number(explicitYear)]
    : [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1];

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const year of candidates) {
    const iso = `${year}-${pad(month)}-${pad(day)}`;
    const distance = Math.abs(new Date(`${iso}T12:00:00Z`).getTime() - now.getTime());
    if (distance < bestDistance) {
      best = iso;
      bestDistance = distance;
    }
  }
  return best;
}
