import * as cheerio from "cheerio";
import type { PreviousItems, ScrapedItem, Source } from "../types";
import { coordsFromMapUrl } from "../lib/geo";
import {
  hoursTableToOccurrences,
  parseIcelandicDate,
  parseOpenHours,
  rangesToOccurrences,
  upcomingDates,
  type TimeRange,
} from "../lib/schedule";
import { clean } from "../lib/text";

/**
 * Sundlaugar.is — every swimming pool, lagoon and natural pool in
 * Iceland (about 100), with address, region and the size of the pools.
 *
 * The site is WordPress: its REST API lists every pool with the time
 * the page was last changed, and the details are on each pool's page:
 *   - name (h1), address ("Skólastígur 4, 600 Akureyri")
 *   - free text about the pools, e.g. "Útisundlaug 25×12 metrar", from
 *     which the sizes are read ("Útilaug 25 × 12 m")
 *   - a Google Maps embed. A few hold a plus code, which gives exact
 *     coordinates; most only repeat the address, so those pools have no
 *     coordinates (we don't use a geocoding service).
 *
 * A pool's page is only fetched when the API says it changed since last
 * time (`version`), and changed pages are fetched with bounded concurrency.
 * The first run fetches all pages; later runs take seconds.
 *
 * Weekly and date-ranged opening hours are read when a page lists them.
 * Holiday exceptions are left out rather than guessed.
 */
const BASE = "https://sundlaugar.is";

/**
 * Raise this when the way pages are read changes (e.g. how sizes are
 * found). It is part of every item's `version`, so all pages are
 * fetched again once.
 */
const PARSER = 4;
const API = `${BASE}/wp-json/wp/v2/sundlaugasafn?per_page=100&_fields=slug,link,title,modified,class_list`;

interface ApiPool {
  slug: string;
  link: string;
  title: { rendered: string };
  modified: string; // "2026-06-21T17:08:24"
  class_list?: string[]; // [..., "category-sudurland", "tag-sundlaug"]
}

const REGIONS: Record<string, string> = {
  hofudborgarsvaedid: "Höfuðborgarsvæðið",
  reykjanes: "Reykjanes",
  vesturland: "Vesturland",
  vestfirdir: "Vestfirðir",
  "nordurland-vestra": "Norðurland vestra",
  "nordurland-eystra": "Norðurland eystra",
  austurland: "Austurland",
  sudurland: "Suðurland",
  halendid: "Hálendið",
};

const KINDS: Record<string, string> = {
  sundlaug: "Sundlaug",
  badlon: "Baðlón",
  natturulaug: "Náttúrulaug",
};

export const sundlaugar: Source = {
  slug: "sundlaugar-is",
  name: "Sundlaugar.is",
  baseUrl: BASE,
  requestDelayMs: 250, // robots.txt has no crawl-delay; cap this source at about 4 requests/second.

  async scrape(http, previous) {
    const pools: ApiPool[] = [];
    for (let page = 1; page <= 5; page++) {
      const batch = JSON.parse(await getTwice(http, `${API}&page=${page}`)) as ApiPool[];
      pools.push(...batch);
      if (batch.length < 100) break;
    }
    if (pools.length === 0) throw new Error("Sundlaugar.is: the API returned no pools — did it change?");

    const items: (ScrapedItem | null)[] = new Array(pools.length).fill(null);
    const failed: string[] = [];
    let nextIndex = 0;
    let completed = 0;
    let stoppedReason: string | null = null;

    const worker = async () => {
      while (nextIndex < pools.length && !stoppedReason) {
        const index = nextIndex++;
        const pool = pools[index];
        const unchanged = reuse(previous, pool);

        if (unchanged) {
          items[index] = unchanged;
        } else {
          try {
            items[index] = parsePoolPage(await getTwice(http, pool.link), pool);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            failed.push(pool.slug);
            const before = previous.get(pool.slug);
            if (before) items[index] = before;
            if (failed.length > pools.length / 4) {
              stoppedReason = `more than a quarter of pool pages failed; last was ${pool.slug}: ${reason}`;
            }
          }
        }

        completed++;
        if (completed % 10 === 0 || completed === pools.length) {
          console.log(`  sundlaugar.is: checked ${completed}/${pools.length} pools`);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(8, pools.length) }, worker));
    if (stoppedReason) throw new Error(`Sundlaugar.is: stopping early; ${stoppedReason}`);
    if (failed.length > pools.length / 4) {
      throw new Error(`Sundlaugar.is: ${failed.length} of ${pools.length} pool pages could not be read`);
    }
    if (failed.length) console.warn(`  sundlaugar.is: skipped ${failed.length} page(s) this time: ${failed.join(", ")}`);
    return items.filter((item): item is ScrapedItem => item !== null);
  },
};

/** The site is sometimes slow to answer: try a page a second time before giving up. */
async function getTwice(http: { getText(url: string): Promise<string> }, url: string): Promise<string> {
  try {
    return await http.getText(url);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw error;
    return http.getText(url);
  }
}

/** "2026-06-21T17:08:24#2": when the page last changed, and which parser read it. */
const versionOf = (pool: ApiPool) => `${pool.modified}#${PARSER}`;

/** The item saved last time, if the pool's page hasn't changed since. */
function reuse(previous: PreviousItems, pool: ApiPool): ScrapedItem | null {
  const before = previous.get(pool.slug);
  if (!before || before.version !== versionOf(pool) || before.scheduleText === undefined) return null;
  return {
    ...before,
    occurrences: openingHoursToOccurrences(before.scheduleText, new Date(), before.title),
  };
}

export function parsePoolPage(html: string, pool: ApiPool): ScrapedItem {
  const $ = cheerio.load(html);
  const name = clean($("h1").first().text()) || decodeEntities(pool.title.rendered);
  const address = clean($('[data-widget_type="post-info.default"]').first().text()) || null;
  const classes = pool.class_list ?? [];
  const region = REGIONS[classes.find((c) => c.startsWith("category-"))?.slice(9) ?? ""] ?? null;
  const kind = KINDS[classes.find((c) => c.startsWith("tag-"))?.slice(4) ?? ""] ?? "Sundlaug";

  const { lines, hours } = contentSections($);
  const size = poolSizes(lines);
  const coords = coordsFromMapUrl($('iframe[src*="maps"]').first().attr("src"));

  return {
    externalId: pool.slug,
    category: "pool",
    title: name,
    // "Útilaug 25 × 12 m · Innilaug 12 × 7 m", or just "Sundlaug" when the page gives no size
    subtitle: size ?? kind,
    description: describe(lines),
    url: pool.link,
    imageUrl: $('meta[property="og:image"]').attr("content") ?? null,
    venue: name,
    venueDetails: { address, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
    tags: [kind, region].filter((t): t is string => Boolean(t)),
    version: versionOf(pool),
    scheduleText: hours,
    occurrences: openingHoursToOccurrences(hours, new Date(), name),
  };
}

/**
 * The page's own text as lines before and after the opening-hours heading.
 * <br> counts as a line break, since facts are often listed that way.
 */
function contentSections($: cheerio.CheerioAPI): { lines: string[]; hours: string[] } {
  const lines: string[] = [];
  const hours: string[] = [];
  let readingHours = false;
  let hoursDone = false;
  // The site header has its own "Opnunartímar um páska" banner: only the page body counts.
  $("header, footer, .elementor-location-header, .elementor-location-footer").remove();
  $('[data-widget_type="image-box.default"], [data-widget_type="text-editor.default"], [data-widget_type="heading.default"]').each(
    (_, widget) => {
      if (hoursDone) return;
      const $widget = $(widget).clone();
      $widget.find("br").replaceWith("\n");
      $widget.find("p, li, div, h1, h2, h3, h4").append("\n");
      for (const line of $widget.text().split("\n").map(clean).filter(Boolean)) {
        if (/^(afgreiðslutím|opnunartím|opening hours)/i.test(line)) {
          readingHours = true;
          const remainder = line.replace(
            /^(?:afgreiðslutím\p{L}*|opnunartím\p{L}*|opening hours)\s*[:\-–—]?\s*/iu,
            "",
          );
          if (remainder) hours.push(remainder);
          continue;
        }
        if (readingHours) {
          if (/^(myndir|gjaldskrá|staðsetning)\b/i.test(line)) {
            hoursDone = true;
            return;
          }
          hours.push(line);
        } else {
          lines.push(line);
        }
      }
    },
  );
  return { lines, hours };
}

/** Turn labelled opening-hour lines into occurrences for the next few days. */
function openingHoursToOccurrences(lines: string[], now: Date, venue: string) {
  const rows: [string, string][] = [];
  const seasonal: { start: number; end: number; hours: TimeRange | "closed" }[] = [];
  for (const line of lines) {
    const dates = line.match(/(\d{1,2}\.\s*[\p{L}]+)\s*[–—-]\s*(\d{1,2}\.\s*[\p{L}]+)\s*:?\s*(.*)$/iu);
    if (dates) {
      const start = parseIcelandicDate(dates[1], now);
      const end = parseIcelandicDate(dates[2], now);
      const hours = parseOpenHours(dates[3]);
      if (start && end && hours) seasonal.push({ start: monthDay(start), end: monthDay(end), hours });
      continue;
    }

    const match = line.match(/\d{1,2}(?:[:.]\d{2})?\s*(?:-|–|—|til)\s*\d{1,2}(?:[:.]\d{2})?/i);
    if (!match || match.index === undefined) continue;
    const label = line
      .slice(0, match.index)
      .replace(/[\s:|]*(?:kl\.?)?[\s:|]*$/i, "")
      .trim();
    if (label) rows.push([label, match[0]]);
  }
  const weekly = hoursTableToOccurrences(rows, now, venue);
  if (seasonal.length === 0) return weekly;

  const weeklyByDate = new Map(weekly.map((occurrence) => [occurrence.startsAt.slice(0, 10), occurrence]));
  return upcomingDates(now).flatMap((date) => {
    const day = monthDay(date);
    const schedule = seasonal.find(({ start, end }) =>
      start <= end ? day >= start && day <= end : day >= start || day <= end,
    );
    if (schedule) {
      return schedule.hours === "closed" ? [] : rangesToOccurrences(date, [schedule.hours], { venue });
    }
    const occurrence = weeklyByDate.get(date);
    return occurrence ? [occurrence] : [];
  });
}

/** "2026-06-01" -> 601, for seasonal ranges that repeat each year. */
function monthDay(date: string): number {
  return Number(date.slice(5, 7) + date.slice(8, 10));
}

const NUMBER = String.raw`(\d{1,3}(?:[.,]\d{1,2})?)`;
const METRES = String.raw`(?:m(?![\p{L}\d²³])|metr\p{L}*)`;

/** "25×12 metrar", "50m x 22m", "8 x25 metrar": length and width in either order. */
const BY = new RegExp(`${NUMBER}\\s*${METRES}?\\s*[x×]\\s*${NUMBER}\\s*${METRES}?`, "iu");
/** "25 metra löng og 12,5 metra breið", "16,67m á lengd og 6,95m breið" */
const LONG_AND_WIDE = new RegExp(
  `${NUMBER}\\s*${METRES}\\s*(?:löng|langar?|á lengd)\\s+og\\s+${NUMBER}\\s*${METRES}\\s*(?:breið|á breidd)`,
  "iu",
);
/** A single length: "25 metra útilaug", "16,7m innilaug", "12.5 m á lengd" */
const LENGTH = new RegExp(`${NUMBER}\\s*${METRES}`, "iu");

/**
 * The size of the pools, from the page's free text:
 *   "Útisundlaug 25×12 metrar" + "Innisundlaug 12×7 metrar." -> "Útilaug 25 × 12 m · Innilaug 12 × 7 m"
 *   "Sundlaugin er 25 metra löng útilaug"                    -> "Útilaug 25 m"
 * Only sentences about a pool count, and only plausible pool lengths
 * (5–60 m): that leaves out water slides, depths, the gym's 600 m² and
 * the pool's volume. At most three, without repeats; null if the page
 * doesn't say.
 */
export function poolSizes(lines: string[]): string | null {
  const sizes: string[] = [];
  for (const line of lines) {
    for (const sentence of line.split(/(?<=[.!?])\s+|;\s*/)) {
      if (!/laug/iu.test(sentence) || /rennibraut/iu.test(sentence)) continue;
      const size = measure(sentence);
      if (size && !sizes.includes(size)) sizes.push(size);
      if (sizes.length === 3) return sizes.join(" · ");
    }
  }
  return sizes.length ? sizes.join(" · ") : null;
}

/** One sentence -> "Útilaug 25 × 12,5 m", "Laug 16,67 m" or null. */
function measure(sentence: string): string | null {
  const both = sentence.match(BY) ?? sentence.match(LONG_AND_WIDE);
  const single = both ? null : sentence.match(LENGTH);
  const match = both ?? single;
  if (!match || match.index === undefined) return null;
  // "0,8 metra – 1,8 metra djúp": a depth, not a length.
  if (/^\s*(?:[-–]\s*\S+\s+\S+\s+)?(?:djúp|dýpi|á dýpt)/iu.test(sentence.slice(match.index + match[0].length))) return null;

  const numbers = match.slice(1, both ? 3 : 2).map((n) => Number(n.replace(",", ".")));
  const [length, width] = [...numbers].sort((a, b) => b - a);
  if (length < 5 || length > 60 || (width !== undefined && width < 2)) return null;

  const text = (n: number) => String(n).replace(".", ",");
  return `${poolKind(sentence, match.index)} ${width === undefined ? text(length) : `${text(length)} × ${text(width)}`} m`;
}

/** "Útilaug" or "Innilaug" if the sentence says which (the mention nearest the size), else "Laug". */
function poolKind(sentence: string, sizeAt: number): string {
  const mentions = [...sentence.matchAll(/(úti|inni)\s?(?:sund)?laug/giu)];
  if (mentions.length === 0) return "Laug";
  const nearest = mentions.reduce((a, b) => (Math.abs(b.index - sizeAt) < Math.abs(a.index - sizeAt) ? b : a));
  return nearest[1].toLowerCase() === "úti" ? "Útilaug" : "Innilaug";
}

/** The first real paragraph about the place, shortened. */
function describe(lines: string[]): string | null {
  const paragraph = lines.find((line) => line.length >= 80 && !/@|https?:/i.test(line));
  if (!paragraph) return null;
  return paragraph.length > 280 ? `${paragraph.slice(0, 277).trimEnd()}…` : paragraph;
}

/** "Sundlaugin &#8211; Hofsósi" -> "Sundlaugin – Hofsósi" (WordPress titles are HTML). */
function decodeEntities(text: string): string {
  return cheerio.load(`<i>${text}</i>`)("i").text();
}
