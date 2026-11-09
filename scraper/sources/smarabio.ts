import * as cheerio from "cheerio";
import type { ScrapedItem, ScrapedOccurrence, Source } from "../types";
import { absoluteUrl, clean, spacedText } from "../lib/text";
import { parseWeekday, rangesToOccurrences, upcomingDates, weekday, type TimeRange } from "../lib/schedule";

/**
 * Smárabíó — the country's biggest cinema, plus an entertainment area
 * (laser tag, arcade, VR...).
 *
 * smarabio.is is a Webflow site and loads its showtimes with JavaScript,
 * so it takes a few steps:
 *   1. /bio lists every movie with the *dates* it is shown
 *   2. each movie page (/kvikmyndir/<slug>) has hidden `.show-item`
 *      elements with data-show-date / -time / -screen / -booking-url
 *   3. /smarabio/opnunartimar has the entertainment area's opening hours
 * Only movies shown in the next few days are fetched, one page each.
 */
const BASE = "https://www.smarabio.is";
const VENUE = "Smárabíó";

interface ListedMovie {
  slug: string;
  title: string;
  imageUrl: string | null;
  subtitle: string | null;
}

export const smarabio: Source = {
  slug: "smarabio",
  name: "Smárabíó",
  baseUrl: BASE,

  async scrape(http) {
    const now = new Date();
    const dates = new Set(upcomingDates(now));
    const items: ScrapedItem[] = [];

    for (const movie of parseMovieList(await http.getText(`${BASE}/bio`), dates)) {
      const url = `${BASE}/kvikmyndir/${movie.slug}`;
      const page = parseMoviePage(await http.getText(url), dates);
      if (page.occurrences.length === 0) continue;
      items.push({
        externalId: movie.slug,
        category: "movie",
        title: page.title ?? movie.title,
        subtitle: movie.subtitle,
        url,
        imageUrl: movie.imageUrl,
        venue: VENUE,
        occurrences: page.occurrences,
      });
    }

    items.push(...(await scrapeActivities(http, now)));
    return items;
  },
};

/**
 * The entertainment area ("skemmtisvæði"): laser tag, the arcade and
 * Fótboltaland, each as its own item with opening hours.
 *
 *  - Laser tag and the arcade have their own pages (description, prices,
 *    and laser tag has its own opening hours).
 *  - Fótboltaland has no page of its own on smarabio.is; it is only
 *    mentioned as part of the entertainment area. If any page we read
 *    mentions it, we add it with the entertainment area's opening hours
 *    and link to the entertainment area page.
 */
const ACTIVITY_PAGES = [
  { id: "lasertag", title: "Lasertag í Smárabíó", path: "/skemmtisvaedi/lasertag" },
  { id: "leiktaekjasalur", title: "Leiktækjasalur Smárabíós", path: "/skemmtisvaedi/leiktaekjasvaedi" },
];

async function scrapeActivities(http: { getText(url: string): Promise<string> }, now: Date): Promise<ScrapedItem[]> {
  const hoursPage = await http.getText(`${BASE}/smarabio/opnunartimar`);
  const area = parseActivityPage(hoursPage, now, "opnunartímar skemmtisvæðis");
  const venueDetails = { address: area.address };
  const items: ScrapedItem[] = [];
  let mentionsFootball = area.mentionsFootball;
  let footballImage = area.footballImage;

  for (const activity of ACTIVITY_PAGES) {
    const url = BASE + activity.path;
    const page = parseActivityPage(await http.getText(url), now, "opnunartímar");
    mentionsFootball ||= page.mentionsFootball;
    footballImage ??= page.footballImage;

    // Pages without their own hours follow the entertainment area's hours.
    const occurrences = page.occurrences.length ? page.occurrences : area.occurrences;
    if (occurrences.length === 0) continue;
    items.push({
      externalId: activity.id,
      category: "activity",
      title: activity.title,
      subtitle: page.summary,
      description: page.description,
      url,
      imageUrl: page.imageFor(activity.path),
      provider: VENUE,
      priceIsk: page.lowestPrice,
      venue: VENUE,
      venueDetails,
      occurrences,
    });
  }

  if (mentionsFootball && area.occurrences.length) {
    items.push({
      externalId: "fotboltaland",
      category: "activity",
      title: "Fótboltaland í Smárabíó",
      subtitle: "Hluti af skemmtisvæði Smárabíós",
      description:
        "Fótboltaland er hluti af skemmtisvæði Smárabíós og er opið á opnunartíma skemmtisvæðisins. Nánari upplýsingar og bókanir á smarabio.is.",
      url: `${BASE}/skemmtisvaedi`,
      imageUrl: footballImage,
      provider: VENUE,
      venue: VENUE,
      venueDetails,
      occurrences: area.occurrences,
    });
  }

  return items;
}

/** Movies from /bio that have a showing on one of `dates` ("YYYY-MM-DD"). */
export function parseMovieList(html: string, dates: Set<string>): ListedMovie[] {
  const $ = cheerio.load(html);
  const movies = new Map<string, ListedMovie>();

  $(".movies_collection-item").each((_, el) => {
    const $el = $(el);
    const slug = $el.find('a[href^="/kvikmyndir/"]').first().attr("href")?.replace("/kvikmyndir/", "");
    if (!slug || movies.has(slug)) return;

    const showDates = $el
      .find(".showtime_collection-item[data-date]")
      .toArray()
      .map((d) => dmyToIso($(d).attr("data-date")));
    if (!showDates.some((d) => d && dates.has(d))) return;

    const meta = $el
      .find(".movie_header-tags p")
      .toArray()
      .map((p) => clean($(p).text()))
      .filter(Boolean);

    movies.set(slug, {
      slug,
      title: clean($el.find("h1").first().text()),
      imageUrl: absoluteUrl($el.find(".code-embed-2 img").first().attr("src"), BASE),
      subtitle: meta.length ? meta.join(" · ") : null, // "2026 · 195 mín · Aldurstakmark: 12"
    });
  });

  return [...movies.values()];
}

export function parseMoviePage(html: string, dates: Set<string>) {
  const $ = cheerio.load(html);
  const occurrences: ScrapedOccurrence[] = [];
  const seen = new Set<string>();

  $(".show-item[data-show-date][data-show-time]").each((_, el) => {
    const $el = $(el);
    const date = dmyToIso($el.attr("data-show-date"));
    const time = $el.attr("data-show-time")?.match(/^(\d{1,2}):(\d{2})/);
    if (!date || !time || !dates.has(date)) return;

    const startsAt = `${date}T${time[1].padStart(2, "0")}:${time[2]}:00Z`;
    const screen = clean($el.attr("data-show-screen"));
    const key = `${startsAt}|${screen}`;
    if (seen.has(key)) return;
    seen.add(key);

    occurrences.push({
      startsAt,
      venue: VENUE,
      url: $el.attr("data-booking-url") || absoluteUrl($el.find("a").attr("href"), BASE),
      note: [screen, clean($el.attr("data-show-break"))].filter(Boolean).join(" · ") || null,
    });
  });

  return { title: clean($("h1").first().text()) || null, occurrences };
}

/**
 * Reads one of Smárabíó's entertainment pages:
 *  - opening hours after `hoursMarker`, e.g.
 *    "Opnunartímar: Mán - fimt: 15:00-20:00 Fös: 15:00-23:00 ..." or
 *    "Opnunartímar skemmtisvæðis Mán - FIM 15:00 til 20:00 ..."
 *  - the first real paragraph as a description
 *  - prices like "30 mín: 2.350kr" and group size like "Fjöldi: 1-20 manns"
 *  - whether "Fótboltaland" is mentioned, and the menu photo of it
 */
export function parseActivityPage(html: string, now: Date, hoursMarker: string) {
  const $ = cheerio.load(html);
  $("script, style").remove();

  // Menu images by link, so each activity can use its own photo.
  const navImages = new Map<string, string>();
  $(".nav-cms-item").each((_, el) => {
    const href = $(el).find("a").first().attr("href");
    const src = $(el).find("img").first().attr("src");
    if (href && src) navImages.set(new URL(href, BASE).pathname, src);
  });
  const footballImage = $('img[src*="fotboltaland"]').first().attr("src") ?? null;

  // Webflow puts each value in its own element, so keep element boundaries as spaces.
  const pageText = () => spacedText($("body").get());

  // The address is in the footer ("Hagasmára 1, 201 Kópavogi").
  const address =
    pageText().match(/[A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+ \d+[a-z]?, \d{3} [A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+/)?.[0] ??
    null;

  // Everything else only from the page content, not the menu/footer
  // (the footer lists every activity name, which would fool the checks).
  $("nav, .nav-cms-wrapper, footer").remove();
  const text = pageText();

  const description =
    $("p, div")
      .toArray()
      .filter((el) => $(el).children("p, div").length === 0)
      .map((el) => clean($(el).text()))
      .find((t) => t.length > 80 && !/opnunartím|hagasmára/i.test(t)) ?? null;

  const prices = [...text.matchAll(/(\d+)\s*mín\s*:?\s*([\d.]+)\s*kr/gi)].map((m) => ({
    minutes: Number(m[1]),
    isk: Number(m[2].replace(/\./g, "")),
  }));
  const groupSize = text.match(/Fjöldi\s*:?\s*(\d+\s*[-–]\s*\d+\s*manns)/i)?.[1];
  const summary =
    prices.map((p) => `${p.minutes} mín: ${p.isk.toLocaleString("is-IS")} kr.`).join(" · ") ||
    (groupSize ? `Fjöldi: ${groupSize.replace(/\s*[-–]\s*/, "–")}` : null);

  const pageImage = $("main img, .section img")
    .toArray()
    .map((img) => img.attribs.src)
    .find((src) => src && !src.endsWith(".svg"));

  return {
    occurrences: parseHours(text, hoursMarker, now),
    address,
    description,
    summary,
    lowestPrice: prices.length ? Math.min(...prices.map((p) => p.isk)) : null,
    mentionsFootball: /fótboltaland/i.test(text),
    footballImage,
    // Own menu photo, else a photo on the page, else the entertainment area's photo.
    imageFor: (path: string) => navImages.get(path) ?? pageImage ?? navImages.get("/skemmtisvaedi") ?? null,
  };
}

const DAY_HOURS =
  /([a-záðéíóúýþæö]{3})[a-záðéíóúýþæö.]*\s*(?:-\s*([a-záðéíóúýþæö]{3})[a-záðéíóúýþæö.]*)?\s*:?\s*(\d{1,2})[:.](\d{2})\s*(?:til|[-–])\s*(\d{1,2})[:.](\d{2})/gi;

/**
 * Opening hours following `marker`. The marker word can also appear in
 * menus ("Opnunartímar" links), so we use the first occurrence that is
 * actually followed by "day + time range" text.
 */
function parseHours(text: string, marker: string, now: Date) {
  const lower = text.toLowerCase();
  let matches: RegExpMatchArray[] = [];
  for (let at = lower.indexOf(marker); at !== -1 && matches.length === 0; at = lower.indexOf(marker, at + 1)) {
    matches = [...lower.slice(at, at + 250).matchAll(DAY_HOURS)].filter((m) => parseWeekday(m[1]) !== null);
  }

  const byDay = new Map<number, TimeRange[]>();
  for (const m of matches) {
    const from = parseWeekday(m[1]);
    const to = m[2] ? parseWeekday(m[2]) : from;
    if (from === null || to === null) continue;
    const range = { start: `${m[3].padStart(2, "0")}:${m[4]}`, end: `${m[5].padStart(2, "0")}:${m[6]}` };
    // Walk from `from` to `to` (Mon-Thu = 1,2,3,4; wraps past Sunday if needed).
    for (let d = from, i = 0; i < 7; d = (d + 1) % 7, i++) {
      byDay.set(d, [range]);
      if (d === to) break;
    }
  }

  return upcomingDates(now).flatMap((date) =>
    rangesToOccurrences(date, byDay.get(weekday(date)) ?? [], { venue: VENUE }),
  );
}

/** "9/11/2026" (day/month/year) -> "2026-11-09" */
function dmyToIso(value: string | undefined): string | null {
  const m = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
