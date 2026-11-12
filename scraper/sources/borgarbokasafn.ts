import type { ScrapedItem, Source } from "../types";
import { ageInfo, ageLimitIn, mentionsAlcohol, welcomesKids } from "../lib/ages";
import { findJsonValues, readFlightData } from "../lib/flight";
import { clean, normaliseIso } from "../lib/text";

/**
 * Borgarbókasafnið — Reykjavík City Library's events: workshops, craft
 * evenings, writing groups, talks, story hours...
 *
 * The events page is a Next.js site; the list is embedded in the page as
 * `"initialEvents":[...]` (see lib/flight.ts). Dates are encoded like
 * "$D2026-11-09T10:00:00.000Z". The library's own categories tell who an
 * event is for: "Börn" alone = for children (age filter 0–14), "Börn" and
 * "Ungmenni" together = for the family.
 */
const BASE = "https://borgarbokasafn.is";

interface LibraryEvent {
  id: number | string;
  permalinkId: string;
  parent?: string;
  title: string;
  text?: string;
  place?: string;
  address?: string;
  start?: string;
  end?: string;
  image?: { original?: { url?: string }; thumbnail?: { url?: string } };
  categories?: { name: string }[];
}

export const borgarbokasafn: Source = {
  slug: "borgarbokasafn",
  name: "Borgarbókasafnið",
  baseUrl: BASE,

  async scrape(http) {
    return parseLibraryEvents(await http.getText(`${BASE}/events`), new Date());
  },
};

export function parseLibraryEvents(html: string, now: Date): ScrapedItem[] {
  const [events] = [...findJsonValues<LibraryEvent[]>(readFlightData(html), "initialEvents", "[")];
  if (!events) throw new Error("Borgarbókasafnið: initialEvents not found — page layout changed?");

  // A repeating event has one row per date; group them by `parent`.
  const items = new Map<string, ScrapedItem>();
  for (const event of events) {
    const categories = (event.categories ?? []).map((c) => clean(c.name)).filter(Boolean);
    const startsAt = normaliseIso(event.start?.replace(/^\$D/, ""));
    if (!startsAt || new Date(startsAt) < now) continue;

    const key = String(event.parent ?? event.id);
    const venue = clean(event.place) || null;
    const occurrence = {
      startsAt,
      endsAt: normaliseIso(event.end?.replace(/^\$D/, "")),
      venue,
      url: `${BASE}/events/${encodeURIComponent(event.permalinkId)}`,
    };

    const existing = items.get(key);
    if (existing) {
      existing.occurrences!.push(occurrence);
      continue;
    }

    const text = clean(event.text);
    const kids = categories.includes("Börn");
    const family = categories.some((c) => /^fjölskyld/iu.test(c));
    const ages = ageInfo({
      limit: ageLimitIn(text),
      alcohol: mentionsAlcohol(event.title),
      kidsOnly: kids && !family && !categories.includes("Ungmenni"),
      family: kids || family || welcomesKids(text),
    });
    items.set(key, {
      externalId: key,
      category: "event",
      title: clean(event.title),
      subtitle: categories.length ? categories.join(", ") : null,
      description: text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text || null,
      url: occurrence.url,
      imageUrl: event.image?.original?.url ?? event.image?.thumbnail?.url ?? null,
      provider: "Borgarbókasafnið",
      venue,
      venueDetails: { address: clean(event.address) || null },
      tags: categories,
      ...ages,
      occurrences: [occurrence],
    });
  }

  return [...items.values()];
}
