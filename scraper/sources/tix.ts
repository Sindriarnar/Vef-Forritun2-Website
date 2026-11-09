import * as cheerio from "cheerio";
import type { ScrapedItem, ScrapedOccurrence, Source } from "../types";
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
 * and poster image from the HTML cards.
 */
const BASE = "https://tix.is";

interface TixBoxOfficeEvent {
  startDate?: string;
  endDate?: string;
  venue?: string;
  hall?: string;
  link?: string;
  categories?: string[];
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
    const html = await http.getText(`${BASE}/`);
    return parseTixPage(html, new Date());
  },
};

export function parseTixPage(html: string, now: Date): ScrapedItem[] {
  const cards = readCards(html);
  const flight = readFlightData(html);
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
      occurrences,
    });
  }

  return [...items.values()];
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
