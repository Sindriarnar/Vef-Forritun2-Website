import { inCategory, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { isDowntown, priceValue } from "@/lib/item-utils";
import { fitsMood, type Mood } from "./moods";

/**
 * The front page's filters. They combine, so each one you add narrows
 * the list down:
 *  - Stemning (moods): pick several and an item must fit *all* of them
 *    (Ókeypis + Fjölskyldan = free things for the family).
 *  - Flokkar (categories): pick several and an item may be in *any* of
 *    them (Bíó + Tónlist = movies and concerts), since an item is only
 *    ever in one category.
 *  - Verð, Tími dags, Miðbærinn, Opið núna, Á tilboði and the search box
 *    each narrow it further.
 * "Hvenær?" (Í dag / Í kvöld / Um helgina) and the age filter are applied
 * before these, see Frontpage.
 */

export type PriceCap = 2000 | 5000 | 10000;
export type DayPart = "morgun" | "sidegi" | "kvold";

export interface Filters {
  moods: Mood[];
  categories: FeedCategory[];
  price: PriceCap | null;
  times: DayPart[];
  downtown: boolean;
  openNow: boolean;
  deals: boolean;
  query: string;
}

export const NO_FILTERS: Filters = {
  moods: [],
  categories: [],
  price: null,
  times: [],
  downtown: false,
  openNow: false,
  deals: false,
  query: "",
};

export const PRICES: { id: PriceCap; label: string }[] = [
  { id: 2000, label: "Undir 2.000 kr." },
  { id: 5000, label: "Undir 5.000 kr." },
  { id: 10000, label: "Undir 10.000 kr." },
];

export const DAY_PARTS: { id: DayPart; label: string; from: string; to: string }[] = [
  { id: "morgun", label: "Fyrir hádegi", from: "00:00", to: "12:00" },
  { id: "sidegi", label: "Síðdegis", from: "12:00", to: "17:00" },
  { id: "kvold", label: "Kvöld", from: "17:00", to: "24:00" },
];

/** The on/off filters, in the order they are shown. */
export const TOGGLES: { id: "downtown" | "openNow" | "deals"; label: string }[] = [
  { id: "openNow", label: "Opið / í gangi núna" },
  { id: "downtown", label: "Í miðbænum" },
  { id: "deals", label: "Á tilboði" },
];

/** How many filters are on (the search box counts as one). */
export function activeCount(f: Filters): number {
  return (
    f.moods.length +
    f.categories.length +
    f.times.length +
    (f.price ? 1 : 0) +
    (f.downtown ? 1 : 0) +
    (f.openNow ? 1 : 0) +
    (f.deals ? 1 : 0) +
    (f.query.trim() ? 1 : 0)
  );
}

/**
 * Does the item pass every filter? `haystack` is the item's searchable
 * text, already normalised (see normalise), so it isn't redone for every
 * check.
 */
export function matches(item: FeedItem, f: Filters, haystack: string): boolean {
  if (f.moods.some((m) => !fitsMood(item, m))) return false;
  if (f.categories.length && !f.categories.some((c) => inCategory(item, c))) return false;
  if (f.price !== null) {
    // An unknown price can't be shown as "under X".
    const price = priceValue(item);
    if (price === null || price >= f.price) return false;
  }
  if (f.times.length && !f.times.some((t) => inDayPart(item, t))) return false;
  if (f.downtown && !isDowntown(item)) return false;
  if (f.openNow && !item.isLive) return false;
  if (f.deals && !onDeal(item)) return false;
  const q = normalise(f.query);
  if (q && !haystack.includes(q)) return false;
  return true;
}

/** The text the search box looks through. */
export function searchText(item: FeedItem): string {
  return normalise(
    `${item.title} ${item.place} ${item.placeDetail ?? ""} ${item.subtitle ?? ""} ${item.categoryLabel} ${(item.tags ?? []).join(" ")}`,
  );
}

/**
 * Does something start in this part of the day? Movies by their
 * showtimes, events by their start time. Happy hours count for the
 * afternoon and evening. Things with no start time (deals, pools, open
 * places, ideas) are left out once a time of day is picked, since we
 * can't tell.
 */
function inDayPart(item: FeedItem, part: DayPart): boolean {
  const { from, to } = DAY_PARTS.find((p) => p.id === part)!;
  const times = item.showtimes?.length
    ? item.showtimes.map((s) => s.time)
    : item.startsAt
      ? [item.startsAt.slice(11, 16)]
      : [];
  if (times.length) return times.some((t) => t >= from && t < to);
  return item.kind === "happy_hour" && part !== "morgun";
}

function onDeal(item: FeedItem): boolean {
  return item.kind === "deal" || item.kind === "happy_hour" || (item.discountPercent ?? 0) > 0 || Boolean(item.originalPriceLabel);
}

/** Lowercase without accents, so "sundholl" finds "Sundhöll". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
