// Shapes shared by the server (which builds them from the database) and
// the client components (which render, filter and save them).
// No server-only imports here.

/** The "story" circles at the top of the feed. */
export type FeedCategory = "matur" | "bio" | "vidburdir" | "afthreying" | "sund" | "hugmyndir";

export const CATEGORIES: { id: FeedCategory; label: string }[] = [
  { id: "afthreying", label: "Afþreying" },
  { id: "vidburdir", label: "Viðburðir" },
  { id: "bio", label: "Bíó" },
  { id: "matur", label: "Matur & drykkur" },
  { id: "sund", label: "Sund" },
  { id: "hugmyndir", label: "Hugmyndir" },
];

/**
 * Who an item is for (set by the scraper, see scraper/lib/ages.ts):
 * "born" = made for children, "fjolskylda" = good for the whole family,
 * null = for teens and adults.
 */
export type Audience = "born" | "fjolskylda";

/** The age filter's choices. 20 is the drinking age in Iceland. */
export type AgeGroup = "0-14" | "fjolskylda" | "15-19" | "20+";

export const AGE_GROUPS: { id: AgeGroup; label: string; hint: string }[] = [
  { id: "0-14", label: "0–14 ára", hint: "Fyrir krakka: sund, afþreying, barnasýningar og myndir sem eru leyfðar þeim." },
  { id: "fjolskylda", label: "Fjölskyldan", hint: "Það sem hentar öllum aldri saman." },
  { id: "15-19", label: "15–19 ára", hint: "Ekkert með áfengi. Viðburðir með 18 ára aldurstakmarki eru merktir 18+." },
  { id: "20+", label: "20+", hint: "Allt fyrir fullorðna, líka happy hour, barir og tilboð með áfengi." },
];

type AgeFields = { minAge?: number | null; audience?: Audience | null };

/**
 * Does an item suit this age group?
 *  - 0–14: made for children or families, or allowed from 14 or younger
 *    (a movie "Bönnuð innan 12 ára")
 *  - Fjölskyldan: made for children or families
 *  - 15–19: everything except children-only things and 20+ (alcohol)
 *  - 20+: everything except children-only things
 */
export function fitsAgeGroup(item: AgeFields, group: AgeGroup): boolean {
  const minAge = item.minAge ?? 0;
  const forKids = item.audience === "born" || item.audience === "fjolskylda";
  switch (group) {
    case "0-14":
      return forKids || (minAge > 0 && minAge <= 14);
    case "fjolskylda":
      return forKids;
    case "15-19":
      return item.audience !== "born" && minAge < 20;
    case "20+":
      return item.audience !== "born";
  }
}

/** Short label for cards: "20+", "12+", "Börn"; null when there is nothing to warn about. */
export function ageBadge(item: AgeFields): string | null {
  if (item.audience === "born") return "Börn";
  return item.minAge && item.minAge >= 6 ? `${item.minAge}+` : null;
}

/** Longer text for the details dialog. */
export function ageText(item: AgeFields): string | null {
  if (item.minAge) return `${item.minAge} ára og eldri`;
  if (item.audience === "born") return "Fyrir börn";
  if (item.audience === "fjolskylda") return "Hentar allri fjölskyldunni";
  return null;
}

export interface Showtime {
  time: string; // "20:30"
  venue: string | null;
  note: string | null; // "Salur 3", "ENG SUB"
  url: string;
}

/** One post in the feed: a deal, a movie, an event, a pool... */
export interface FeedItem {
  id: string; // stable across scrapes, e.g. "deal-hopkaup-16191", "movie-iceguys"
  kind: "deal" | "movie" | "event" | "happy_hour" | "pool" | "activity" | "idea";
  category: FeedCategory;
  categoryLabel: string;
  place: string; // post header: who/where
  placeDetail: string | null; // address or extra place info
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  url: string; // the source page (info / booking)
  sourceName: string;
  priceLabel: string | null; // "1.425 kr."
  originalPriceLabel: string | null;
  priceNote: string | null; // "á tilboði", "frá"
  discountPercent: number | null;
  tag: string | null; // label on the image when there is no discount
  whenLabel: string | null; // "Opið til 22:00", "mið. 11. nóv. kl. 20:00"
  isLive: boolean; // open / happening right now
  startsAt: string | null; // next start, ISO
  timeLabel?: string | null; // "20:00"
  dayKey?: string | null; // "2026-11-11", for grouping by day
  dayHeading?: string | null; // "Á morgun", "Fimmtudagur 12. nóvember"
  dateParts?: { weekday: string; day: string; month: string } | null;
  tags?: string[]; // e.g. ideas: "Frítt", "Úti", "Vinahópur"
  // Optional because items saved in "Planið" before the age filter don't have them.
  minAge?: number | null; // 20 = alcohol / 20 ára aldurstakmark, 12 = "Bönnuð innan 12 ára"
  audience?: Audience | null;
  showtimes?: Showtime[];
  lat?: number | null;
  lng?: number | null;
}
