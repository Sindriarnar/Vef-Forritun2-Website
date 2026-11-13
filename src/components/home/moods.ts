import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";

/**
 * The front page's two kinds of filter:
 *  - "Hvenær?" (when): Í dag, Í kvöld, Um helgina. Always one chosen.
 *  - "Stemning" (mood): Ókeypis, Stefnumót, Fjölskyldan, Rólegt, Fjör.
 *    Optional; picking one again turns it off.
 *
 * Moods are guessed from what the scraper already knows (kind, category,
 * tags, time, age limits). Nobody tags things "date night", so these are
 * rules of thumb: easy to tweak below.
 */

export type When = "idag" | "ikvold" | "helgin";
export type Mood = "okeypis" | "stefnumot" | "fjolskyldan" | "rolegt" | "fjor";

export const WHENS: { id: When; label: string }[] = [
  { id: "idag", label: "Í dag" },
  { id: "ikvold", label: "Í kvöld" },
  { id: "helgin", label: "Um helgina" },
];

export const MOODS: { id: Mood; label: string; blurb: string }[] = [
  { id: "okeypis", label: "Ókeypis", blurb: "Kostar ekki krónu" },
  { id: "stefnumot", label: "Stefnumót", blurb: "Matur, sýning, tónleikar" },
  { id: "fjolskyldan", label: "Fjölskyldan", blurb: "Fyrir litla og stóra" },
  { id: "rolegt", label: "Rólegt", blurb: "Sund, sýningar, bíó" },
  { id: "fjor", label: "Fjör", blurb: "Hátt stemningsstig" },
];

/** What the page knows about "now", worked out on the server so both sides agree. */
export interface Calendar {
  today: string; // "2026-11-13"
  weekend: string[]; // the coming (or current) Fri–Sun that are not over: ["2026-11-13", "2026-11-14", "2026-11-15"]
  headings: Record<string, string>; // "2026-11-14" -> "Á morgun", "2026-11-15" -> "Sunnudagur 15. nóvember"
}

/** Evening starts at 17:00 (Iceland is on UTC all year, so ISO times are local). */
const EVENING = "17:00";

const tagText = (item: FeedItem) => `${item.categoryLabel} ${(item.tags ?? []).join(" ")}`;
const hour = (item: FeedItem) => item.startsAt?.slice(11, 16) ?? null;

const CALM = /sýning|safn|klassík|kammer|kór|bókmennt|ljóð|jazz|djass|blús|handverk|sígild/i;
const LOUD = /rokk|popp|rapp|diskó|uppistand|dægurl|experimental|tribute|partí|dj/i;
const DATE = /leikhús|tónleik|tónlist|uppistand|jazz|djass|óper|söngleik|klassík|sinfón/i;

export function fitsWhen(item: FeedItem, when: When, cal: Calendar): boolean {
  const day = item.dayKey ?? null;
  switch (when) {
    case "idag":
      // Dated things today; undated things (deals, open places, ideas) are "today" too.
      return day === null || day === cal.today;
    case "ikvold": {
      if (item.kind === "happy_hour" || item.kind === "restaurant") return true;
      if (item.kind === "movie") return day === cal.today && (item.showtimes ?? []).some((s) => s.time >= EVENING);
      if (item.kind === "event") return day === cal.today && (hour(item) ?? "") >= EVENING;
      return false;
    }
    case "helgin":
      // Weekend events; plus things that are on any day anyway.
      if (item.kind === "event") return day !== null && cal.weekend.includes(day);
      if (item.kind === "movie") return day !== null && cal.weekend.includes(day);
      return item.kind === "activity" || item.kind === "deal" || item.kind === "idea" || item.kind === "pool";
  }
}

export function fitsMood(item: FeedItem, mood: Mood): boolean {
  const tags = tagText(item);
  const forKids = item.audience === "born";
  switch (mood) {
    case "okeypis":
      return item.free === true;
    case "fjolskyldan":
      return fitsAgeGroup(item, "fjolskylda");
    case "stefnumot":
      if (forKids) return false;
      if (item.kind === "restaurant" || item.kind === "happy_hour") return true;
      if (item.kind === "movie") return true;
      if (item.kind === "deal") return item.category === "matur";
      if (item.kind === "event") return (hour(item) ?? "") >= "18:00" || DATE.test(tags);
      if (item.kind === "idea") return /par|stefnum|rómant/i.test(tags);
      return false;
    case "rolegt":
      if (item.kind === "pool" || item.kind === "movie") return true;
      if (item.kind === "idea") return !/fjör|hreyfing/i.test(tags);
      return CALM.test(tags) && !LOUD.test(tags);
    case "fjor":
      if (item.kind === "happy_hour") return true;
      if (item.kind === "activity") return !/sýning|verslun/i.test(item.categoryLabel);
      if (item.kind === "deal") return item.category === "afthreying";
      return LOUD.test(tags) || (item.kind === "event" && item.music === true && !CALM.test(tags));
  }
}

/**
 * Order for the card grid: dated things by time, and the different kinds
 * mixed (an event, a deal, a movie, a place...) so 100 pools in a row
 * never bury everything else.
 */
const KIND_ORDER: FeedItem["kind"][] = ["event", "deal", "movie", "activity", "restaurant", "happy_hour", "idea", "pool"];

export function mixKinds(items: FeedItem[]): FeedItem[] {
  const groups = KIND_ORDER.map((kind) =>
    items
      .filter((i) => i.kind === kind)
      .sort((a, b) => (a.startsAt && b.startsAt ? a.startsAt.localeCompare(b.startsAt) : 0)),
  );
  const out: FeedItem[] = [];
  const longest = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < longest; i++) for (const g of groups) if (i < g.length) out.push(g[i]);
  return out;
}
