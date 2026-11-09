import * as cheerio from "cheerio";
import type { ScrapedItem, Source } from "../types";
import { absoluteUrl, clean } from "../lib/text";

/**
 * Bíó Paradís — Reykjavík's art-house cinema.
 *
 * The front page has the program for the next ~6 days, one
 * `div.shows#shows_YYYY-MM-DD` per day. Compared with kvikmyndir.is this
 * adds subtitle language (ENG SUB / ICE SUB) and series/festival labels
 * such as "Miðvikudagsbíó" or "Ítalskir kvikmyndadagar".
 */
const BASE = "https://bioparadis.is";
const VENUE = "Bíó Paradís";

export const bioparadis: Source = {
  slug: "bioparadis",
  name: "Bíó Paradís",
  baseUrl: BASE,

  async scrape(http) {
    return parseProgram(await http.getText(`${BASE}/`));
  },
};

export function parseProgram(html: string): ScrapedItem[] {
  const $ = cheerio.load(html);
  const movies = new Map<string, ScrapedItem>();

  $('div.shows[id^="shows_20"]').each((_, day) => {
    const date = day.attribs.id.replace("shows_", ""); // "2026-11-09"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    $(day)
      .children("ul")
      .children("li")
      .each((_, entry) => {
        const $entry = $(entry);
        const $link = $entry.find("h4 a").first();
        const href = $link.attr("href") ?? "";
        const id = href.match(/\/mynd\/(\d+)_/)?.[1];
        const title = clean($link.text());
        if (!id || !title) return;

        const series = clean($entry.find("span.event").first().text());
        const movie =
          movies.get(id) ??
          ({
            externalId: id,
            category: "movie",
            title,
            url: absoluteUrl(href, BASE)!,
            imageUrl: absoluteUrl($entry.find(".poster img").first().attr("src"), BASE),
            venue: VENUE,
            tags: [],
            occurrences: [],
          } satisfies ScrapedItem);
        if (series && !movie.tags!.includes(series)) movie.tags!.push(series);

        $entry.find("ul.timar > li").each((_, slot) => {
          const $slot = $(slot);
          const subtitles = clean($slot.find(".sub").text()); // "ENG SUB"
          const time = clean($slot.find(".top-showtime").text()).match(/(\d{1,2}):(\d{2})/);
          if (!time) return;
          movie.occurrences!.push({
            startsAt: `${date}T${time[1].padStart(2, "0")}:${time[2]}:00Z`,
            venue: VENUE,
            url: $slot.find(".bottom-buy-ticket a").attr("href") ?? null,
            note: [series, subtitles].filter(Boolean).join(" · ") || null,
          });
        });

        movies.set(id, movie);
      });
  });

  return [...movies.values()].filter((m) => m.occurrences!.length > 0);
}
