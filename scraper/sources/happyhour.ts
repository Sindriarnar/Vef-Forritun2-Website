import * as cheerio from "cheerio";
import type { ScrapedItem, Source } from "../types";
import { absoluteUrl, clean } from "../lib/text";
import { parseTimeRanges, parseWeekday, rangesToOccurrences, upcomingDates, weekday } from "../lib/schedule";

/**
 * Happyhour.is — happy hours at bars and restaurants.
 *
 * Every listing on the front page is a `.coupon_frame` with:
 *   - the times:  .timedate  "16:00 - 19:00"
 *   - the days:   .day.on    "mon", "tue", ...
 *   - a Google Maps embed URL whose "!3d<lat>!2d<lng>" gives coordinates
 * containing a `.coupon_info` block (name, address, link), and a hidden
 * `#offer_<id>` popup with the description and prices.
 */
const BASE = "https://www.happyhour.is";

export const happyhour: Source = {
  slug: "happyhour",
  name: "Happyhour.is",
  baseUrl: BASE,

  async scrape(http) {
    return parseHappyHours(await http.getText(`${BASE}/`), new Date());
  },
};

export function parseHappyHours(html: string, now: Date): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items = new Map<string, ScrapedItem>();

  $(".coupon_frame").each((_, frame) => {
    const $frame = $(frame);
    const $link = $frame.find('a[href^="#offer_"]').first();
    const id = $link.attr("href")?.replace("#offer_", "");
    if (!id || items.has(id)) return;

    const $popup = $(`#offer_${id}`);
    const $info = $frame.find(".coupon_info").first();
    const name = clean($popup.find("h3").first().text()) || clean($info.find("h3").first().text());
    if (!name) return;

    const timeText = clean($frame.find(".timedate").text());
    const ranges = parseTimeRanges(timeText);
    if (ranges.length === 0) return;

    // Days marked "on"; if the site shows no days, assume every day.
    const days = $frame
      .find(".day.on")
      .toArray()
      .map((d) => parseWeekday($(d).text()))
      .filter((d): d is number => d !== null);
    const activeDays = new Set(days.length ? days : [0, 1, 2, 3, 4, 5, 6]);

    const mapUrl = $link.attr("data-map") ?? "";
    const lat = Number(mapUrl.match(/!3d(-?\d+\.\d+)/)?.[1]);
    const lng = Number(mapUrl.match(/!2d(-?\d+\.\d+)/)?.[1]);

    const occurrences = upcomingDates(now)
      .filter((date) => activeDays.has(weekday(date)))
      .flatMap((date) => rangesToOccurrences(date, ranges, { venue: name }));

    items.set(id, {
      externalId: id,
      category: "happy_hour",
      title: name,
      subtitle: `Happy hour ${timeText}`,
      description: describe($, $popup),
      provider: name,
      url: absoluteUrl($info.find("a.coupon_info_url").attr("href"), BASE) ?? `${BASE}/`,
      imageUrl: absoluteUrl($link.find("img").attr("src"), BASE),
      venue: name,
      venueDetails: {
        address: clean($info.find("p").first().text()) || null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      },
      occurrences,
    });
  });

  return [...items.values()];
}

/** The popup text without the name, contact details and embeds, shortened. */
function describe($: cheerio.CheerioAPI, $popup: ReturnType<cheerio.CheerioAPI>): string | null {
  const copy = $popup.clone();
  copy.find("h3, iframe, .popup_tripadvisor, p[style*='float']").remove();
  const text = clean(copy.text());
  if (!text) return null;
  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text;
}
