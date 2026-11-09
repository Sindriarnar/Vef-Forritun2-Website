import * as cheerio from "cheerio";
import type { ScrapedItem, ScrapedOccurrence, Source } from "../types";
import { absoluteUrl, clean } from "../lib/text";
import {
  parseIcelandicDate,
  parseTimeRanges,
  parseWeekday,
  rangesToOccurrences,
  upcomingDates,
  weekday,
  type TimeRange,
} from "../lib/schedule";

/**
 * Sundlaugar Reykjavíkur — the city's 8 public pools.
 *
 * Opening hours come from https://reykjavik.is/sundlaugar/afgreidslutimi,
 * which has two tables:
 *   1. the normal weekly hours (rows = weekdays, columns = pools)
 *   2. special hours on public holidays (rows = dates, columns = pools)
 * Holidays override the weekly hours. Each pool's own page adds its
 * address, a photo and a short description.
 */
const BASE = "https://reykjavik.is";
const HOURS_URL = `${BASE}/sundlaugar/afgreidslutimi`;

/** Known pools. Table headers are abbreviated ("Árbæjarl.") so we match by prefix. */
const POOLS = [
  { name: "Árbæjarlaug", path: "/arbaejarlaug" },
  { name: "Breiðholtslaug", path: "/breidholtslaug" },
  { name: "Dalslaug", path: "/dalslaug" },
  { name: "Grafarvogslaug", path: "/grafarvogslaug" },
  { name: "Klébergslaug", path: "/klebergslaug" },
  { name: "Laugardalslaug", path: "/laugardalslaug" },
  { name: "Sundhöll Reykjavíkur", path: "/sundholl-reykjavikur" },
  { name: "Vesturbæjarlaug", path: "/vesturbaejarlaug" },
];

type Pool = (typeof POOLS)[number];

export const reykjavikPools: Source = {
  slug: "sundlaugar",
  name: "Sundlaugar Reykjavíkur",
  baseUrl: BASE,

  async scrape(http) {
    const now = new Date();
    const hours = parseOpeningHours(await http.getText(HOURS_URL), now);

    const items: ScrapedItem[] = [];
    for (const pool of POOLS) {
      const occurrences = hours.get(pool.name);
      if (!occurrences) continue; // not in the table any more

      const page = parsePoolPage(await http.getText(BASE + pool.path));
      items.push({
        externalId: pool.path.slice(1),
        category: "pool",
        title: pool.name,
        url: BASE + pool.path,
        description: page.description,
        imageUrl: page.imageUrl,
        venue: pool.name,
        venueDetails: { address: page.address, url: BASE + pool.path },
        occurrences,
      });
    }
    return items;
  },
};

/** pool name -> opening-hour occurrences for the coming days. */
export function parseOpeningHours(html: string, now: Date): Map<string, ScrapedOccurrence[]> {
  const $ = cheerio.load(html);
  const weekly = new Map<string, Map<number, TimeRange[]>>(); // pool -> weekday -> ranges
  const holidays = new Map<string, Map<string, { ranges: TimeRange[]; name: string }>>();

  $("table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    if (rows.length < 2) return;

    // Header row: first cell is the row label, the rest are pools.
    const columns = $(rows[0])
      .children("th, td")
      .toArray()
      .slice(1)
      .map((cell) => findPool(clean($(cell).text())));

    for (const row of rows.slice(1)) {
      const cells = $(row).children("th, td").toArray();
      const label = clean($(cells[0]).text());
      const day = parseWeekday(label);
      const date = day === null ? parseIcelandicDate(label, now) : null;
      if (day === null && !date) continue;

      cells.slice(1).forEach((cell, i) => {
        const pool = columns[i];
        if (!pool) return;
        // "06:30–10:00 og<br>12:00-22:00" -> two ranges; "Lokað" -> none.
        const ranges = parseTimeRanges(clean($(cell).text()));
        if (day !== null) {
          if (!weekly.has(pool.name)) weekly.set(pool.name, new Map());
          weekly.get(pool.name)!.set(day, ranges);
        } else if (date) {
          if (!holidays.has(pool.name)) holidays.set(pool.name, new Map());
          const holidayName = label.split(/\s+-\s+/).slice(1).join(" - ").replace(/\s*20\d{2}$/, "");
          holidays.get(pool.name)!.set(date, { ranges, name: holidayName });
        }
      });
    }
  });

  const result = new Map<string, ScrapedOccurrence[]>();
  for (const pool of POOLS) {
    if (!weekly.has(pool.name)) continue;
    const occurrences: ScrapedOccurrence[] = [];
    for (const date of upcomingDates(now)) {
      const holiday = holidays.get(pool.name)?.get(date);
      const ranges = holiday ? holiday.ranges : (weekly.get(pool.name)!.get(weekday(date)) ?? []);
      occurrences.push(
        ...rangesToOccurrences(date, ranges, {
          venue: pool.name,
          note: holiday ? `Frídagur: ${holiday.name}` : null,
        }),
      );
    }
    result.set(pool.name, occurrences);
  }
  return result;
}

function findPool(header: string): Pool | undefined {
  const prefix = header.replace(/\.$/, "").toLowerCase();
  if (!prefix) return undefined;
  return POOLS.find((pool) => pool.name.toLowerCase().startsWith(prefix));
}

function parsePoolPage(html: string) {
  const $ = cheerio.load(html);

  // The address is split over lines with <br>: "Sundlaugavegur 30<br>105 Reykjavík"
  const addressHtml = $("p.address").first().html() ?? "";
  const address =
    addressHtml
      .split(/<br\s*\/?>/i)
      .map((part) => clean(cheerio.load(part).text()))
      .filter(Boolean)
      .join(", ") || null;

  const description =
    $(".CityBlock__summary p")
      .toArray()
      .map((p) => clean($(p).text()))
      .find((text) => text.length > 20) ?? null;

  // The big photo at the top of the page. Fallback: the first content
  // image that isn't a small badge/logo (e.g. the 50px "Regnbogavottun" icon).
  const imageSrc =
    $(".InfoHero__image img").first().attr("src") ??
    $('img[src*="/sites/default/files/styles/"]')
      .filter((_, img) => Number(img.attribs.width ?? 0) >= 300)
      .first()
      .attr("src");

  return { address, description, imageUrl: absoluteUrl(imageSrc, BASE) };
}
