import * as cheerio from "cheerio";
import type { Category, ScrapedItem, Source } from "../types";
import { ageInfo, mentionsAlcohol } from "../lib/ages";
import { clean } from "../lib/text";

/**
 * Ofurkaup.is — group-buying deals (like Hópkaup): restaurants, spa,
 * activities and trips at a discount.
 *
 * The front page lists every deal as a card: category, discount,
 * "company · town", title, price, original price and time left.
 * The cards have no photo, so each new deal's own page is read once for
 * its picture and description (`previous` remembers them after that).
 *
 * Product deals ("Vörur": headphones, lamps...) and "Heilsa" (remote
 * training, glasses) are skipped: they aren't things to go and do.
 */
const BASE = "https://ofurkaup.is";

/** Ofurkaup's categories -> ours. Categories not listed here are skipped. */
const CATEGORIES: Record<string, Category> = {
  Veitingar: "food_deal",
  Afþreying: "activity_deal",
  Upplifanir: "activity_deal",
  Dekur: "activity_deal",
  Gisting: "activity_deal",
};

export const ofurkaup: Source = {
  slug: "ofurkaup",
  name: "Ofurkaup",
  baseUrl: BASE,

  async scrape(http, previous) {
    const deals = parseFrontPage(await http.getText(`${BASE}/`), new Date());
    if (deals.length === 0) throw new Error("Ofurkaup: no deals found on the front page — layout changed?");

    for (const deal of deals) {
      const before = previous.get(deal.externalId);
      if (before && before.version === deal.version) {
        deal.imageUrl = before.imageUrl;
        deal.description = before.description;
        continue;
      }
      // A new deal: its page has the photo and a description.
      try {
        Object.assign(deal, parseDealPage(await http.getText(deal.url)));
      } catch {
        // The card alone is enough; try the page again next time.
        deal.version = null;
      }
    }
    return deals;
  },
};

export function parseFrontPage(html: string, now: Date): ScrapedItem[] {
  const $ = cheerio.load(html);
  const deals = new Map<string, ScrapedItem>();

  $('a[href^="/tilbod/"]').each((_, card) => {
    const $card = $(card);
    const href = $card.attr("href")!;
    const slug = href.replace("/tilbod/", "").replace(/\/$/, "");
    const title = clean($card.find("h3").first().text());
    const category = CATEGORIES[clean($card.find(".dots span").first().text())];
    if (!slug || !title || !category || deals.has(slug)) return;

    const text = clean($card.text());
    const prices = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*) kr\./g)].map((m) => Number(m[1].replace(/\./g, "")));
    const original = Number(clean($card.find(".line-through").first().text()).replace(/\D/g, "")) || null;
    const discount = Number(text.match(/-\s*(\d{1,2})\s*%/)?.[1]) || null;

    deals.set(slug, {
      externalId: slug,
      category,
      title,
      // "Biryani Kebab · Keflavík" (the deals are from all over the country)
      provider: clean($card.find(".truncate").first().text()).replace(/\s*·\s*$/, "") || null,
      url: BASE + href,
      priceIsk: prices[0] ?? null,
      originalPriceIsk: original,
      discountPercent: discount,
      validUntil: timeLeft(text, now),
      // The deal's page is only read again if the offer itself changes.
      version: `${prices[0] ?? ""}/${original ?? ""}`,
      ...ageInfo({ alcohol: mentionsAlcohol(title), family: /fjölskyld|krakk|börn/iu.test(title) }),
    });
  });

  return [...deals.values()];
}

/** Photo and description from a deal's own page (its social-media preview tags). */
export function parseDealPage(html: string): Pick<ScrapedItem, "imageUrl" | "description"> {
  const $ = cheerio.load(html);
  const description = clean($('meta[property="og:description"]').attr("content"));
  return {
    imageUrl: $('meta[property="og:image"]').attr("content") ?? null,
    description: description.length > 280 ? `${description.slice(0, 277).trimEnd()}…` : description || null,
  };
}

/** "17 d 18 klst eftir" / "19 klst 34 mín eftir" -> when the deal ends (ISO), or null. */
function timeLeft(text: string, now: Date): string | null {
  const m = text.match(/((?:\d+\s*(?:d|klst|mín)\s*)+)eftir/);
  if (!m) return null;
  const amount = (unit: string) => Number(m[1].match(new RegExp(`(\\d+)\\s*${unit}(?!\\p{L})`, "u"))?.[1] ?? 0);
  const minutes = amount("d") * 24 * 60 + amount("klst") * 60 + amount("mín");
  if (!minutes) return null;
  return new Date(now.getTime() + minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}
