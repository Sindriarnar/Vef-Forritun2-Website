import type { Category, ScrapedItem, Source } from "../types";
import { clean, icelandTimeToIso } from "../lib/text";

/**
 * Hópkaup.is — Icelandic group-buying site with restaurant and
 * activity deals (price, original price and discount %).
 *
 * Hópkaup is a Next.js (pages router) site, so every category page ships
 * its data as JSON in <script id="__NEXT_DATA__">. No HTML parsing needed.
 */
const BASE = "https://hopkaup.is";

/** Which Hópkaup categories we collect, and how we label them. */
const CATEGORIES: { path: string; category: Category }[] = [
  { path: "veitingar", category: "food_deal" }, // Veitingatilboð
  { path: "upplifun", category: "activity_deal" }, // Upplifunartilboð
];

interface HopkaupDeal {
  id: number;
  title: string;
  dealProvider?: string;
  url: string;
  imageUrl?: string;
  originalPrice?: number;
  price?: number;
  discountPercentage?: number;
  validFrom?: { date?: string };
}

interface HopkaupCategoryContent {
  popularDeals?: HopkaupDeal[];
  newestDeals?: HopkaupDeal[];
  restOfDeals?: HopkaupDeal[];
}

export const hopkaup: Source = {
  slug: "hopkaup",
  name: "Hópkaup",
  baseUrl: BASE,

  async scrape(http) {
    const items = new Map<string, ScrapedItem>();
    for (const { path, category } of CATEGORIES) {
      const html = await http.getText(`${BASE}/${path}`);
      for (const item of parseCategoryPage(html, category)) {
        // A deal listed in two categories keeps the first one.
        if (!items.has(item.externalId)) items.set(item.externalId, item);
      }
    }
    return [...items.values()];
  },
};

export function parseCategoryPage(html: string, category: Category): ScrapedItem[] {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Hópkaup: __NEXT_DATA__ not found — page layout changed?");

  const content: HopkaupCategoryContent | undefined =
    JSON.parse(match[1])?.props?.pageProps?.categoryContent;
  if (!content) throw new Error("Hópkaup: categoryContent missing — page layout changed?");

  const deals = [
    ...(content.popularDeals ?? []),
    ...(content.newestDeals ?? []),
    ...(content.restOfDeals ?? []),
  ];

  return deals
    .filter((deal) => deal?.id && deal.title && deal.url)
    .map((deal) => ({
      externalId: String(deal.id),
      category,
      title: clean(deal.title),
      provider: clean(deal.dealProvider) || null,
      url: `${BASE}/${deal.url}`,
      imageUrl: deal.imageUrl ?? null,
      priceIsk: deal.price ?? null,
      originalPriceIsk: deal.originalPrice ?? null,
      discountPercent: deal.discountPercentage ?? null,
      validFrom: icelandTimeToIso(deal.validFrom?.date),
    }));
}
