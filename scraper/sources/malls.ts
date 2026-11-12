import * as cheerio from "cheerio";
import type { ScrapedItem, Source } from "../types";
import { findAddress, hoursTableToOccurrences } from "../lib/schedule";
import { absoluteUrl, clean } from "../lib/text";

/**
 * The two big shopping centres: Smáralind and Kringlan.
 *
 * What we take is their opening hours, as places you can go to today:
 *  - the centre itself ("Smáralind — Opið til 19:00")
 *  - the food halls: the 13 restaurants of Garðurinn in Smáralind, each
 *    with its own hours, and Kúmen in Kringlan
 * Shops, products and sales aren't read. (Kringlan's shop and
 * restaurant lists come from its /api/, which robots.txt disallows.)
 *
 * Items tagged "Verslun" / "Veitingastaður" get those labels on the
 * website (src/lib/feed.ts).
 */

// ---------------------------------------------------------------- Smáralind

const SMARALIND = "https://www.smaralind.is";

export const smaralind: Source = {
  slug: "smaralind",
  name: "Smáralind",
  baseUrl: SMARALIND,

  async scrape(http) {
    const hours = await http.getText(`${SMARALIND}/opnunartimar`);
    // The food hall's page names its restaurants; their hours are on the hours page.
    const foodHall = await http.getText(`${SMARALIND}/gardurinn`);
    return parseSmaralind(hours, foodHall, new Date());
  },
};

export function parseSmaralind(hoursHtml: string, foodHallHtml: string, now: Date): ScrapedItem[] {
  const $ = cheerio.load(hoursHtml);
  const venueDetails = { address: findAddress(clean($("body").text())) };

  // "Almennir opnunartímar": Virka daga 11-19 · Laugardaga 11-18 · Sunnudaga 12-17
  const general = $("h2")
    .filter((_, h) => /almennir opnunartímar/i.test($(h).text()))
    .first()
    .parent()
    .parent();
  const mallHours = hoursTableToOccurrences(tableRows($, general), now, "Smáralind");
  if (mallHours.length === 0) throw new Error("Smáralind: opening hours not found — page changed?");

  const items: ScrapedItem[] = [
    {
      externalId: "smaralind",
      category: "activity",
      title: "Smáralind",
      subtitle: "Verslunarmiðstöð í Kópavogi",
      url: SMARALIND,
      imageUrl: $('meta[property="og:image"]').attr("content") ?? null,
      provider: "Smáralind",
      venue: "Smáralind",
      venueDetails,
      tags: ["Verslun"],
      occurrences: mallHours,
    },
  ];

  // The food hall page has one <h3> per restaurant ("NEÓ Pizza", written "Neó Pizza" on the hours page).
  const $foodHall = cheerio.load(foodHallHtml);
  const restaurants = new Set($foodHall("h3").toArray().map((h) => clean($foodHall(h).text()).toLowerCase()));

  $('a[href^="/fyrirtaeki/"]').each((_, link) => {
    const $link = $(link);
    const name = clean($link.find("h3").first().text());
    if (!restaurants.has(name.toLowerCase())) return; // only the food hall's restaurants
    const occurrences = hoursTableToOccurrences(tableRows($, $link), now, "Smáralind");
    if (occurrences.length === 0) return;

    const href = $link.attr("href")!;
    items.push({
      externalId: `veitingar-${href.split("/").pop()}`,
      category: "activity",
      title: name,
      subtitle: "Garðurinn mathöll í Smáralind",
      url: SMARALIND + href,
      imageUrl: mediumImage($link.find("img").first().attr("srcset"), SMARALIND),
      provider: "Smáralind",
      venue: "Smáralind",
      venueDetails,
      tags: ["Veitingastaður"],
      occurrences,
    });
  });

  return items;
}

/** [day label, hours] for every <li><span>Virka daga</span><span>11-19</span></li> inside an element. */
function tableRows($: cheerio.CheerioAPI, $scope: ReturnType<cheerio.CheerioAPI>): [string, string][] {
  return $scope
    .find("li")
    .toArray()
    .map((li) => $(li).children("span").toArray().map((span) => clean($(span).text())))
    .filter((cells) => cells.length >= 2)
    .map((cells) => [cells[0], cells[1]] as [string, string]);
}

/** A ~640px wide picture from a Next.js srcset ("/_next/image?url=...&w=640&q=80 640w, ..."). */
function mediumImage(srcset: string | undefined, base: string): string | null {
  if (!srcset) return null;
  const candidates = srcset
    .split(/,\s+(?=\/|https?:)/)
    .map((part) => {
      const [url, width] = part.trim().split(/\s+/);
      return { url, width: parseInt(width, 10) || 0 };
    })
    .filter((c) => c.url && c.width >= 384 && c.width <= 828)
    .sort((a, b) => b.width - a.width);
  return absoluteUrl(candidates[0]?.url, base);
}

// ---------------------------------------------------------------- Kringlan

const KRINGLAN = "https://www.kringlan.is";

export const kringlan: Source = {
  slug: "kringlan",
  name: "Kringlan",
  baseUrl: KRINGLAN,

  async scrape(http) {
    return parseKringlan(await http.getText(`${KRINGLAN}/`), new Date());
  },
};

/**
 * Kringlan's front page ends with its hours as plain text:
 *   Opnunartímar · Mánudaga – Föstudaga · 10:00 – 18:30 · Laugardaga · 11:00 – 18:00 ·
 *   Sunnudaga · 12:00 – 17:00 · ... · Kúmen · Alla daga · 11:00 – 20:00
 */
export function parseKringlan(html: string, now: Date): ScrapedItem[] {
  const $ = cheerio.load(html);
  const address = organisationAddress($);
  $("script, style, noscript").remove();
  const tokens = textTokens($);

  const mallHours = hoursTableToOccurrences(rowsAfter(tokens, "Opnunartímar"), now, "Kringlan");
  if (mallHours.length === 0) throw new Error("Kringlan: opening hours not found — page changed?");

  const items: ScrapedItem[] = [
    {
      externalId: "kringlan",
      category: "activity",
      title: "Kringlan",
      subtitle: "Verslunarmiðstöð í Reykjavík",
      url: KRINGLAN,
      imageUrl: absoluteUrl($('meta[property="og:image"]').attr("content"), KRINGLAN),
      provider: "Kringlan",
      venue: "Kringlan",
      venueDetails: { address },
      tags: ["Verslun"],
      occurrences: mallHours,
    },
  ];

  const foodHallHours = hoursTableToOccurrences(rowsAfter(tokens, "Kúmen"), now, "Kringlan");
  if (foodHallHours.length) {
    items.push({
      externalId: "kumen",
      category: "activity",
      title: "Kúmen",
      subtitle: "Mathöll í Kringlunni",
      url: `${KRINGLAN}/veitingastadir`,
      provider: "Kringlan",
      venue: "Kringlan",
      venueDetails: { address },
      tags: ["Veitingastaður"],
      occurrences: foodHallHours,
    });
  }

  return items;
}

/** Minimal shape of a cheerio/domhandler node, enough to walk the tree. */
interface DomNode {
  type: string;
  data?: string;
  children?: DomNode[];
}

/** Every piece of visible text on the page, in reading order. */
function textTokens($: cheerio.CheerioAPI): string[] {
  const tokens: string[] = [];
  const walk = (node: DomNode) => {
    if (node.type === "text") {
      const text = clean(node.data);
      if (text) tokens.push(text);
    }
    node.children?.forEach(walk);
  };
  ($("body").get() as DomNode[]).forEach(walk);
  return tokens;
}

/**
 * The [day label, hours] pairs that come right after a heading, e.g.
 * after "Kúmen": [["Alla daga", "11:00 – 20:00"]]. The heading may
 * appear several times (menus); the first one followed by hours counts.
 */
function rowsAfter(tokens: string[], heading: string): [string, string][] {
  for (let i = tokens.indexOf(heading); i !== -1; i = tokens.indexOf(heading, i + 1)) {
    const rows: [string, string][] = [];
    for (let j = i + 1; j + 1 < tokens.length && /\d/.test(tokens[j + 1]) && !/\d/.test(tokens[j]); j += 2) {
      rows.push([tokens[j], tokens[j + 1]]);
    }
    if (rows.length) return rows;
  }
  return [];
}

/** "Kringlunni 4-12, 103 Reykjavík" from the page's schema.org Organization data. */
function organisationAddress($: cheerio.CheerioAPI): string | null {
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(script).text()) as { address?: { streetAddress?: string; postalCode?: string; addressLocality?: string } };
      const a = data.address;
      if (a?.streetAddress) return clean(`${a.streetAddress}, ${a.postalCode ?? ""} ${a.addressLocality ?? ""}`);
    } catch {
      // not JSON we understand
    }
  }
  return null;
}
