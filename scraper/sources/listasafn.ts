import * as cheerio from "cheerio";
import type { ScrapedItem, Source } from "../types";
import { rangesToOccurrences, upcomingDates, weekday, type TimeRange, parseTimeRanges } from "../lib/schedule";
import { absoluteUrl, clean, spacedText } from "../lib/text";

/**
 * Listasafn Reykjavíkur — Reykjavík Art Museum's current exhibitions in
 * its three buildings (Hafnarhús, Kjarvalsstaðir, Ásmundarsafn).
 *
 * The front page lists the current exhibitions ("Yfirstandandi sýningar")
 * as cards (title, building, image) and, in the footer, each building's
 * address and opening hours, e.g.
 *   "Hafnarhús Tryggvagata 17 4116410 Opnunartímar 10:00-17:00 Fimmtudaga 10:00–22:00"
 * Each exhibition becomes an item that is "open" during its building's hours.
 */
const BASE = "https://listasafnreykjavikur.is";
const BUILDINGS = ["Hafnarhús", "Kjarvalsstaðir", "Ásmundarsafn"];

export const listasafn: Source = {
  slug: "listasafn",
  name: "Listasafn Reykjavíkur",
  baseUrl: BASE,

  async scrape(http) {
    const items = parseExhibitions(await http.getText(`${BASE}/`), new Date());
    // The images are huge originals (often 2–3 MB). Their image server
    // (Strapi) also keeps a ~750px "medium_" copy of large images; use it
    // when it exists.
    for (const item of items) {
      const medium = item.imageUrl?.replace(/\/uploads\/(?!medium_)([^/]+)$/, "/uploads/medium_$1");
      if (medium && medium !== item.imageUrl && (await http.exists(medium))) item.imageUrl = medium;
    }
    return items;
  },
};

export function parseExhibitions(html: string, now: Date): ScrapedItem[] {
  const $ = cheerio.load(html);
  $("script, style").remove();
  const buildings = readBuildings(spacedText($("body").get()));

  const items = new Map<string, ScrapedItem>();
  $('a[href^="/syningar/"]').each((_, el) => {
    const $card = $(el);
    const href = $card.attr("href")!;
    const slug = href.replace("/syningar/", "");
    const title = clean($card.find("h3").first().text());
    const buildingName = clean($card.find("h3").first().next("p").text());
    const building = buildings.get(buildingName);
    if (!slug || !title || !building || items.has(slug)) return;

    const occurrences = upcomingDates(now).flatMap((date) =>
      rangesToOccurrences(date, weekday(date) === 4 && building.thursday ? building.thursday : building.daily, {
        venue: buildingName,
      }),
    );

    items.set(slug, {
      externalId: slug,
      category: "activity",
      title,
      subtitle: `Sýning · ${buildingName}`,
      url: absoluteUrl(href, BASE)!,
      imageUrl: originalImage($card.find("img").first().attr("src")),
      provider: "Listasafn Reykjavíkur",
      venue: buildingName,
      venueDetails: { address: building.address },
      tags: ["Sýning"],
      occurrences,
    });
  });

  return [...items.values()];
}

/** Building -> address + daily hours (+ late Thursday hours if listed). */
function readBuildings(text: string) {
  const buildings = new Map<string, { address: string | null; daily: TimeRange[]; thursday: TimeRange[] | null }>();
  for (const name of BUILDINGS) {
    // The name appears many times (cards, menus); use the mention that is
    // followed by an address, phone number and "Opnunartímar".
    let section = "";
    let m: RegExpMatchArray | null = null;
    for (let at = text.indexOf(`${name} `); at !== -1 && !m; at = text.indexOf(`${name} `, at + 1)) {
      section = text.slice(at, at + 160);
      m = section.match(/^\S+\s+([^0-9]{2,40}\s\d+[a-z]?)\s+(?:\d{7}\s+)?Opnunartímar\s+(\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2})/);
    }
    if (!m) continue;
    // Only this building's part (its own hours + a possible Thursday line).
    const own = section.slice(0, section.indexOf("Opnunartímar") + 60);
    const thursday = own.match(/Fimmtudaga\s+(\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2})/)?.[1];
    // "Sigtún 105" is street + postcode (101–116), "Tryggvagata 17" is street + number.
    const [, street, number] = m[1].trim().match(/^(.*?)\s+(\d+[a-z]?)$/) ?? [, m[1].trim(), ""];
    const isPostcode = /^1(0[1-9]|1[0-6])$/.test(number ?? "");
    buildings.set(name, {
      address: isPostcode ? `${street}, ${number} Reykjavík` : `${street} ${number}, Reykjavík`.replace(" ,", ","),
      daily: parseTimeRanges(m[2]),
      thursday: thursday ? parseTimeRanges(thursday) : null,
    });
  }
  return buildings;
}

/** "/_next/image?url=https%3A%2F%2F...jpg&w=3840" -> the original image URL. */
function originalImage(src: string | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("/_next/image")) {
    const url = new URL(src, BASE).searchParams.get("url");
    return url ? absoluteUrl(url, BASE) : null;
  }
  return absoluteUrl(src, BASE);
}
