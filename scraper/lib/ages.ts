import type { Audience, Category, ScrapedItem } from "../types";

/**
 * Who an item suits, for the age filter on the website
 * (0–14 ára · Fjölskyldan · 15–19 ára · 20+):
 *
 *  - minAge: the youngest age allowed. 20 for anything with alcohol (the
 *    drinking age in Iceland) or a "20 ára aldurstakmark", 18 for 18+
 *    events, a movie's rating ("Bönnuð innan 12 ára" -> 12).
 *    null = no known limit.
 *  - audience: "born" = made for children (hidden for 15–19 and 20+),
 *    "fjolskylda" = good for the whole family (shown for every age),
 *    null = nothing special known (shown for every age that minAge allows,
 *    but not under "Fjölskyldan").
 *
 * Sources set these when they know (movie ratings, "18 ára aldurstakmark"
 * in an event description, family tags...); otherwise the category
 * decides (resolveAges). The website turns them into age groups in
 * src/lib/feed-types.ts (fitsAgeGroup).
 */

export interface AgeInfo {
  minAge: number | null;
  audience: Audience | null;
}

// JavaScript's \b only knows English letters, so words are delimited with
// "not a letter" lookarounds instead (\p{L} needs the u flag). A drink
// right after "áfengislaus" (alcohol-free kokteill) doesn't count.
const L = "\\p{L}";
const drinks = (...parts: string[]) =>
  new RegExp(`(?<!${L})(?<!(?:áfengislaus|óáfeng)${L}*\\s+)(?:${parts.join("|")})(?!${L})`, "iu");

/** Drinks with alcohol, in Icelandic and English. */
const ALCOHOL = drinks(
  `${L}*bjór${L}*`, // bjór, kranabjór, bjórsmökkun
  // vín, rauðvín, vínsmökkun, Vínskólinn... but not svín (pork), vínber, vínarbrauð, vínyl
  `${L}*(?<!s)vín(?:s|i|ið|in|sins|smökk${L}*|skól${L}*|pör${L}*|gl[ae]s${L}*|kynn${L}*|bar${L}*|seð${L}*|flösk${L}*)?`,
  `kok?kteil${L}*`,
  `cocktails?`,
  `m[ií]m[oó]s${L}*`, // mímósa, "Brunch með mimosu"
  `spritz`,
  `aperol`,
  `prosecco`,
  `vod[kc]${L}*`,
  `viskí${L}*`,
  `whiske?y`,
  `happy hour`,
  `áfeng(?!islaus)${L}*`, // áfengi, but not áfengislaus (alcohol-free)
  `barsvar${L}*`, // pub quiz
  `pöbb${L}*`,
  `beers?`,
  `wines?`,
);

const N = "(\\d{1,2})";
/** Ways an age limit is written. Each captures the age. */
const LIMITS = [
  `${N}\\s*ára\\s+aldurstakmark`, // "18 ára aldurstakmark"
  `aldurstakmark${L}*[^.\\d]{0,40}?${N}[\\s.]*ár`, // "Aldurstakmark er 20 ára", "...á kvöldtónleika er 20 ára", "Aldurstakmark 20.ára"
  `bönnuð\\s+(?:börnum\\s+|áhorfendum\\s+)?(?:innan|yngri\\s+en)\\s+${N}`, // movie ratings
  `ekki\\s+við\\s+hæfi\\s+(?:${L}+\\s+)?(?:yngri\\s+en|undir)\\s+${N}`, // "ekki við hæfi barna yngri en 13 ára"
  `henta\\s+ekki\\s+(?:${L}+\\s+)?undir\\s+${N}\\s*ára`, // "henta ekki einstaklingum undir 20 ára aldri"
  `við\\s+hæfi\\s+${N}\\s*ára\\s+og\\s+eldri`, // "Við hæfi 12 ára og eldri"
  `age\\s+limit\\D{0,20}${N}`,
  `${N}\\s*years?\\s+(?:and\\s+)?(?:older|over)`,
].map((pattern) => new RegExp(pattern, "giu"));

/**
 * "20 ára aldurstakmark á kvöldtónleikana kl 21:00": the limit is only for
 * some of the shows (the earlier ones are for everyone), so it doesn't
 * count for the event as a whole.
 */
const ONLY_SOME_SHOWS = /(?:kvöld|seinni|síðari|miðnætur)(?:sýning|tónleik)/iu;

/** Signs that children are welcome (free for kids, family shows...). */
const KIDS_WELCOME = new RegExp(
  [
    `(?:frítt|ókeypis|frír\\s+aðgangur)[^.]{0,40}(?:börn|${N}\\s*ára\\s+og\\s+yngri)`,
    `börn\\s+á\\s+aldrinum`,
    `fyrir\\s+alla\\s+fjölskylduna`,
    `fjölskyldu(?:sýning|tónleik|skemmtun|viðburð|stund|dag|vænt)${L}*`,
    `barna(?:sýning|leikrit|tónleik|skemmtun|dagskrá)${L}*`,
  ].join("|"),
  "iu",
);

/** Tix.is categories such as "Barna", "Fjölskyldan", "Börn og fjölskylda", "Barnaviðburðir". */
const FAMILY_TAG = /^(?:barna|börn|fjölskyld)/iu;

/** The highest age limit mentioned in the text, e.g. "18 ára aldurstakmark" -> 18. */
export function ageLimitIn(text: string | null | undefined): number | null {
  if (!text) return null;
  let highest: number | null = null;
  for (const pattern of LIMITS) {
    for (const match of text.matchAll(pattern)) {
      if (ONLY_SOME_SHOWS.test(sentenceAround(text, match.index, match[0].length))) continue;
      const age = Number(match[1]);
      // Ratings and limits in Iceland are between 6 and 20.
      if (age >= 6 && age <= 20 && (highest === null || age > highest)) highest = age;
    }
  }
  return highest;
}

/** The sentence (or line) around text[start, start + length). */
function sentenceAround(text: string, start: number, length: number): string {
  const from = Math.max(text.lastIndexOf(".", start - 1), text.lastIndexOf("\n", start - 1)) + 1;
  const ends = [text.indexOf(".", start + length), text.indexOf("\n", start + length)].filter((i) => i !== -1);
  return text.slice(from, ends.length ? Math.min(...ends) : text.length);
}

export const mentionsAlcohol = (text: string | null | undefined) => Boolean(text && ALCOHOL.test(text));
export const welcomesKids = (text: string | null | undefined) => Boolean(text && KIDS_WELCOME.test(text));
export const isFamilyTag = (tag: string) => FAMILY_TAG.test(tag);

/**
 * Puts the clues together. A real age limit wins over family tags: a
 * 16+ show tagged "Fjölskyldan" is not shown for families.
 */
export function ageInfo(clues: { limit?: number | null; alcohol?: boolean; family?: boolean; kidsOnly?: boolean }): AgeInfo {
  const minAge = Math.max(clues.limit ?? 0, clues.alcohol ? 20 : 0) || null;
  if (minAge !== null && minAge >= 12) return { minAge, audience: null };
  return { minAge, audience: clues.kidsOnly ? "born" : clues.family ? "fjolskylda" : null };
}

/**
 * Icelandic movie ratings, as the cinema sites write them:
 *   kvikmyndir.is: "Öllum leyfð" (everyone), "Bönnuð innan 12 ára"
 *   Smárabíó:      "2026 · 105 mín · Aldurstakmark: Leyfð", "... Aldurstakmark: 12"
 * Films allowed from 9 or younger count as family films.
 * No rating in the text = unknown, and nothing is returned.
 */
export function movieRating(rating: string | null | undefined): Partial<AgeInfo> {
  if (!rating) return {};
  if (/öllum\s+leyfð|aldurstakmark:?\s*leyfð/iu.test(rating)) return { minAge: null, audience: "fjolskylda" };
  const limit = Number(rating.match(/aldurstakmark:?\s*(\d{1,2})(?!\d)/iu)?.[1]) || ageLimitIn(rating);
  return limit ? { minAge: limit, audience: limit <= 9 ? "fjolskylda" : null } : {};
}

/** Used when a source doesn't say anything about ages. */
const CATEGORY_DEFAULTS: Partial<Record<Category, AgeInfo>> = {
  happy_hour: { minAge: 20, audience: null }, // bars
  pool: { minAge: null, audience: "fjolskylda" },
  activity: { minAge: null, audience: "fjolskylda" }, // laser tag, bowling, skating, climbing, museums
};

/** What gets saved: the source's own answer if it gave one, else the category default. */
export function resolveAges(item: Pick<ScrapedItem, "category" | "minAge" | "audience">): AgeInfo {
  if (item.minAge !== undefined || item.audience !== undefined) {
    return { minAge: item.minAge ?? null, audience: item.audience ?? null };
  }
  return CATEGORY_DEFAULTS[item.category] ?? { minAge: null, audience: null };
}
