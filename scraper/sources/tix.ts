import * as cheerio from "cheerio";
import type { ScrapedItem, ScrapedOccurrence, Source } from "../types";
import { ageInfo, ageLimitIn, isFamilyTag, mentionsAlcohol, welcomesKids } from "../lib/ages";
import { findJsonValues, readFlightData } from "../lib/flight";
import { absoluteUrl, clean, normaliseIso } from "../lib/text";

/**
 * Tix.is — concerts, theatre, shows and other ticketed events.
 *
 * tix.is is itself a Next.js site. The visible cards only show text like
 * "26. desember", but the page also embeds the full event data (exact
 * start times, venue, price range, categories) in the React Server
 * Components payload (`self.__next_f.push(...)` scripts). We read the
 * `boxOfficeData` objects from that payload, and take the nice event URL
 * and poster image from the HTML cards. The front page and the category
 * pages are all read (see PAGES).
 *
 * Age limits ("18 ára aldurstakmark", "Aldurstakmark er 20 ár") are only
 * written in the event descriptions, which sit next to boxOfficeData in
 * the event's Contentful `fields` object (rich text).
 */
const BASE = "https://tix.is";

interface TixBoxOfficeEvent {
  startDate?: string;
  endDate?: string;
  venue?: string;
  hall?: string;
  link?: string;
  categories?: string[];
  description?: unknown; // plain text or Contentful rich text
}

interface TixBoxOfficeData {
  name?: string;
  link?: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  isSoldOut?: boolean;
  events?: TixBoxOfficeEvent[];
}

export const tix: Source = {
  slug: "tix",
  name: "Tix.is",
  baseUrl: BASE,

  async scrape(http) {
    const now = new Date();
    const items = new Map<string, ScrapedItem>();

    for (const path of PAGES) {
      let html: string;
      try {
        html = await http.getText(BASE + path);
      } catch (error) {
        // The front page must work; a category page that is gone (e.g.
        // /category/jol after Christmas) only means fewer extra events.
        if (path === "/") throw error;
        console.warn(`  tix.is: skipped ${path} (${error instanceof Error ? error.message : error})`);
        continue;
      }
      for (const item of parseTixPage(html, now)) {
        const seen = items.get(item.externalId);
        items.set(item.externalId, seen ? mergeItems(seen, item) : item);
      }
    }

    return [...items.values()];
  },
};

/**
 * The front page only shows a selection of what is on sale (~160
 * events). The category pages list the rest (~380 in total); the "by
 * venue" pages are the fullest. Every page is the same kind of Next.js
 * page, read one at a time with the usual pause in between.
 */
const PAGES = [
  "/",
  "/category/music/by-venue",
  "/category/theater/by-theater",
  "/category/music",
  "/category/theater",
  "/category/family",
  "/category/jol",
  "/category/sports",
  "/category/courses",
  "/category/festival",
];

/**
 * The same event found on two pages. Pages don't all carry the same
 * details (poster, description with the age limit), so keep the first
 * and fill in what it is missing; the strictest age limit wins.
 */
function mergeItems(first: ScrapedItem, other: ScrapedItem): ScrapedItem {
  const minAge = Math.max(first.minAge ?? 0, other.minAge ?? 0) || null;
  return {
    ...first,
    imageUrl: first.imageUrl ?? other.imageUrl,
    tags: [...new Set([...(first.tags ?? []), ...(other.tags ?? [])])],
    minAge,
    audience: minAge !== null && minAge >= 12 ? null : (first.audience ?? other.audience ?? null),
  };
}

export function parseTixPage(html: string, now: Date): ScrapedItem[] {
  const cards = readCards(html);
  const flight = readFlightData(html);
  const descriptions = readDescriptions(flight);
  const items = new Map<string, ScrapedItem>();

  for (const data of findJsonValues<TixBoxOfficeData>(flight, "boxOfficeData")) {
    const id = data.link?.match(/tickets\/(\d+)/)?.[1];
    const title = clean(data.name);
    if (!id || !title || items.has(id)) continue;

    const occurrences: ScrapedOccurrence[] = [];
    const tags = new Set<string>();
    for (const event of data.events ?? []) {
      const startsAt = normaliseIso(event.startDate);
      if (!startsAt || new Date(startsAt) < now) continue;
      occurrences.push({
        startsAt,
        endsAt: normaliseIso(event.endDate),
        venue: clean(event.venue || event.hall) || null,
        url: event.link ?? null,
      });
      event.categories?.forEach((c) => tags.add(clean(c)));
    }
    // Only keep events that still have a date in the future.
    if (occurrences.length === 0) continue;

    const text = [descriptions.get(id), ...(data.events ?? []).map((e) => plainText(e.description))].join("\n");
    const ages = ageInfo({
      limit: ageLimitIn(text),
      alcohol: mentionsAlcohol(title), // "Tipsý kokteilnámskeið", "Bjór og matur"
      family: [...tags].some(isFamilyTag) || welcomesKids(text),
    });

    const card = cards.get(id);
    items.set(id, {
      externalId: id,
      category: "event",
      title,
      url: card?.url ?? `${BASE}/event/${id}`,
      imageUrl: card?.imageUrl ?? null,
      venue: occurrences[0].venue,
      priceIsk: data.priceFrom ?? null,
      subtitle: data.isSoldOut ? "Uppselt" : null,
      tags: [...tags],
      ...ages,
      occurrences,
    });
  }

  return [...items.values()];
}

/**
 * Event id -> description text. Descriptions live in Contentful entries
 * nested anywhere in the page data (front page sections, `eventGroups`,
 * `subEventGroups`...), so every entry with a `description` is checked.
 */
function readDescriptions(flight: string): Map<string, string> {
  const texts = new Map<string, Set<string>>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const entry = node as Record<string, unknown>;
    if (entry.description) {
      const id = ticketId(entry);
      const text = plainText(entry.description);
      if (id && text) texts.set(id, (texts.get(id) ?? new Set()).add(text));
    }
    Object.values(entry).forEach(visit);
  };
  for (const fields of findJsonValues<unknown>(flight, "fields")) visit(fields);
  return new Map([...texts].map(([id, set]) => [id, [...set].join("\n")]));
}

/** The event an entry is about: its own ticket link, or the only ticket link inside it. */
function ticketId(entry: Record<string, unknown>): string | null {
  const box = entry.boxOfficeData as TixBoxOfficeData | undefined;
  const own = box?.link ?? (typeof entry.link === "string" ? entry.link : "");
  const direct = own.match(/tickets\/(\d+)/)?.[1];
  if (direct) return direct;
  const ids = new Set([...JSON.stringify(entry).matchAll(/tickets\/(\d+)/g)].map((m) => m[1]));
  return ids.size === 1 ? [...ids][0] : null;
}

/** Text of a Contentful rich-text document (nested nodes with `value`s), or a plain string. */
function plainText(node: unknown): string {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(plainText).join("");
  const { value, content, nodeType } = node as { value?: unknown; content?: unknown; nodeType?: unknown };
  return (typeof value === "string" ? value : "") + plainText(content) + (nodeType === "paragraph" ? "\n" : "");
}

/** Event id -> { url, imageUrl } from the visible cards. */
function readCards(html: string) {
  const $ = cheerio.load(html);
  const cards = new Map<string, { url: string; imageUrl: string | null }>();

  $('a[href^="/event/"]').each((_, el) => {
    const href = $(el).attr("href")!;
    const id = href.match(/^\/event\/(\d+)/)?.[1];
    if (!id) return;

    const previous = cards.get(id);
    const imageUrl = largestSrc($(el).find("img").first().attr("srcset"));
    if (previous && (previous.imageUrl || !imageUrl)) return;
    cards.set(id, { url: absoluteUrl(href, BASE)!, imageUrl: imageUrl ?? previous?.imageUrl ?? null });
  });

  return cards;
}

/** Picks a medium-large candidate (<= 828px wide) from a srcset string. */
function largestSrc(srcset: string | undefined): string | null {
  if (!srcset) return null;
  const candidates = srcset
    .split(/,\s+(?=https?:)/)
    .map((part) => {
      const [url, width] = part.trim().split(/\s+/);
      return { url, width: parseInt(width, 10) || 0 };
    })
    .filter((c) => c.url && c.width <= 828)
    .sort((a, b) => b.width - a.width);
  return candidates[0]?.url ?? null;
}
