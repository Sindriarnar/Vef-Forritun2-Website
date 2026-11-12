/**
 * Recognising the same movie on different websites. Used by the scraper
 * (it saves items.match_key) and by the website when it merges movies
 * from several sources. No imports, so both sides can use it.
 */

/**
 * A key for recognising the same movie across sites:
 *   "Iceguys – kvikmyndin" / "IceGuys the Movie" / "Iceguys: The Movie" -> "iceguys"
 *   "Shrek 5 (ÍSL.TAL)" -> "shrek 5 isl tal"  (dubbed stays separate from the original)
 */
export function matchKey(title: string): string {
  return title
    .replace(/[­​-‍﻿]/g, "") // soft hyphens, zero-width characters
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents: á -> a, ö -> o
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the movie|kvikmyndin|myndin)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keys for a title that has a second title in brackets, the way Bíó
 * Paradís writes "Icelandic title (Original title)":
 *   "Fjörður (Fjord)" -> ["fjordur", "fjord"]
 * so it can be matched with "Fjord" on kvikmyndir.is. Brackets about the
 * language or format ("(ÍSL. TAL)", "(ENG SUB)", "(3D)") aren't titles
 * and give nothing.
 */
export function altTitleKeys(title: string): string[] {
  const parts = title.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!parts) return [];
  const inBrackets = parts[2];
  if (!/\p{L}{3}/u.test(inBrackets) || /\b(tal|subs?|texti|3d|4dx|imax)\b/i.test(inBrackets)) return [];
  return [matchKey(parts[1]), matchKey(inBrackets)].filter(Boolean);
}
