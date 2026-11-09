import * as cheerio from "cheerio";
import type { ScrapedItem, ScrapedOccurrence, Source } from "../types";
import { absoluteUrl, clean, icelandTimeToIso } from "../lib/text";

/**
 * Kvikmyndir.is — today's showtimes in (almost) every Icelandic cinema.
 *
 * Page: https://kvikmyndir.is/bio/syningatimar/
 * Each movie is a `.section.group.box` block; every showtime is an
 * `a.st-showtime-link` with machine-readable data-* attributes:
 *   data-showtime="2026-11-09 14:20:00"  data-cinema="Sambíóin Kringlunni"
 * and its href goes straight to the cinema's ticket page.
 */
const BASE = "https://kvikmyndir.is";
const SHOWTIMES_URL = `${BASE}/bio/syningatimar/`;

export const kvikmyndir: Source = {
  slug: "kvikmyndir",
  name: "Kvikmyndir.is",
  baseUrl: BASE,

  async scrape(http) {
    const html = await http.getText(SHOWTIMES_URL);
    return parseShowtimes(html);
  },
};

export function parseShowtimes(html: string): ScrapedItem[] {
  const $ = cheerio.load(html);
  const movies = new Map<string, ScrapedItem>();

  $(".section.group.box").each((_, block) => {
    const $block = $(block);
    const $titleLink = $block.find("a.movie_title").first();
    const movieId = $titleLink.attr("href")?.match(/[?&]id=(\d+)/)?.[1];
    if (!movieId) return;

    const $title = $titleLink.find(".title").first().clone();
    $title.find(".year").remove();
    const title = clean($title.text());
    if (!title) return;

    const occurrences: ScrapedOccurrence[] = [];
    $block.find("a.st-showtime-link").each((_, link) => {
      const $link = $(link);
      const startsAt = icelandTimeToIso($link.attr("data-showtime"));
      if (!startsAt) return;
      occurrences.push({
        startsAt,
        endsAt: endTime(startsAt, $link.find(".st-end").text()),
        venue: clean($link.attr("data-cinema")) || null,
        url: absoluteUrl($link.attr("href"), BASE),
        note: clean($link.find(".salur").text()) || null,
      });
    });
    if (occurrences.length === 0) return;

    const ageRating = clean($block.find(".aldur").text());
    const existing = movies.get(movieId);
    if (existing) {
      existing.occurrences!.push(...occurrences);
      return;
    }

    movies.set(movieId, {
      externalId: movieId,
      category: "movie",
      title,
      subtitle: clean($block.find(".st-meta").first().text()) || null,
      url: `${BASE}/mynd/?id=${movieId}`,
      imageUrl: absoluteUrl($block.find(".poster img").first().attr("src"), BASE),
      tags: ageRating ? [ageRating] : [],
      occurrences,
    });
  });

  return [...movies.values()];
}

/** "til 16:22" + start date -> ISO end time (handles shows ending after midnight). */
function endTime(startsAt: string, text: string): string | null {
  const m = text.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const end = new Date(startsAt);
  end.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
  if (end.getTime() < new Date(startsAt).getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return end.toISOString().replace(/\.\d{3}Z$/, "Z");
}
