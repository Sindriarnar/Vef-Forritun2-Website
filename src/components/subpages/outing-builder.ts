import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { isDowntown, priceValue, travelBetween, type Travel } from "@/lib/item-utils";

/**
 * Ready-made outings for Planið ("Tilbúin plön"): a template is a list of
 * stops ("something fun", then "a swim", then "food"), and the builder
 * fills each stop with something that is actually open or on at that
 * time today, close to the previous stop, within the chosen budget.
 *
 * Everything here runs on today's data from getFeed(): open hours of
 * places, event start times and movie showtimes.
 */

export type TimeOfDay = "allt" | "siddegi" | "kvold";
export type Budget = "allt" | "15000" | "5000" | "0";

export const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: "allt", label: "Allan daginn" },
  { id: "siddegi", label: "Síðdegi" },
  { id: "kvold", label: "Kvöld" },
];

export const BUDGETS: { id: Budget; label: string }[] = [
  { id: "allt", label: "Hvað sem er" },
  { id: "15000", label: "Undir 15.000" },
  { id: "5000", label: "Undir 5.000" },
  { id: "0", label: "Ókeypis" },
];

const WINDOWS: Record<TimeOfDay, [number, number]> = {
  allt: [9 * 60, 24 * 60],
  siddegi: [12 * 60, 18 * 60],
  kvold: [17 * 60, 24 * 60],
};

interface Slot {
  label: string; // "Sund", "Kvöldmatur"
  minutes: number; // how long the stop takes
  pick(item: FeedItem): boolean;
  optional?: boolean; // the outing still works without it
}

interface Template {
  id: string;
  title: string;
  blurb: string;
  tone: "coral" | "plum" | "sun" | "sea" | "pink" | "green";
  window: [number, number]; // minutes after midnight
  stops: Slot[];
}

const tagText = (i: FeedItem) => `${i.categoryLabel} ${(i.tags ?? []).join(" ")}`;
const SHOW = /leikhús|tónleik|tónlist|uppistand|jazz|djass|óper|söngleik|klassík|sinfón|dans/i;
const LOUD = /rokk|popp|rapp|uppistand|dægurl|experimental|diskó|partí/i;
const isFun = (i: FeedItem) => i.kind === "activity" && !/sýning|verslun/i.test(i.categoryLabel);
const forFamily = (i: FeedItem) => fitsAgeGroup(i, "fjolskylda");
const notKidsOnly = (i: FeedItem) => i.audience !== "born";

const TEMPLATES: Template[] = [
  {
    id: "fjolskylda",
    title: "Fjölskyldusíðdegi",
    blurb: "Eitthvað skemmtilegt, svo sund og loks matur. Ungir sem aldnir koma þreyttir og sáttir heim.",
    tone: "sun",
    window: [11 * 60, 19 * 60],
    stops: [
      { label: "Fjör fyrir krakkana", minutes: 90, pick: (i) => (isFun(i) || i.kind === "event") && forFamily(i) },
      { label: "Sund", minutes: 90, pick: (i) => i.kind === "pool" },
      { label: "Eitthvað að borða", minutes: 60, pick: (i) => i.kind === "restaurant" && (i.minAge ?? 0) < 18, optional: true },
    ],
  },
  {
    id: "okeypis",
    title: "Ókeypis dagur",
    blurb: "Útivera, söfn og viðburðir sem kosta ekki krónu.",
    tone: "green",
    window: [10 * 60, 22 * 60],
    stops: [
      { label: "Út að ganga", minutes: 90, pick: (i) => i.free === true && i.kind === "idea" },
      { label: "Frítt og skemmtilegt", minutes: 90, pick: (i) => i.free === true },
      { label: "Ein í viðbót", minutes: 60, pick: (i) => i.free === true, optional: true },
    ],
  },
  {
    id: "stefnumot",
    title: "Stefnumótakvöld",
    blurb: "Fordrykkur, kvöldmatur og sýning eða tónleikar á eftir.",
    tone: "pink",
    window: [16 * 60, 24 * 60],
    stops: [
      { label: "Fordrykkur", minutes: 60, pick: (i) => i.kind === "happy_hour", optional: true },
      { label: "Kvöldmatur", minutes: 90, pick: (i) => i.kind === "restaurant" },
      {
        label: "Sýning eða tónleikar",
        minutes: 120,
        pick: (i) => notKidsOnly(i) && ((i.kind === "event" && SHOW.test(tagText(i))) || i.kind === "movie"),
      },
    ],
  },
  {
    id: "midbaer",
    title: "Kvöld í miðbænum",
    blurb: "Allt í göngufæri: happy hour, matur og eitthvað á sviði.",
    tone: "plum",
    window: [16 * 60, 24 * 60],
    stops: [
      { label: "Happy hour", minutes: 60, pick: (i) => i.kind === "happy_hour" && isDowntown(i), optional: true },
      { label: "Matur", minutes: 90, pick: (i) => i.kind === "restaurant" && isDowntown(i), optional: true },
      { label: "Á sviði eða í bíó", minutes: 120, pick: (i) => (i.kind === "event" || i.kind === "movie") && notKidsOnly(i) && isDowntown(i) },
    ],
  },
  {
    id: "rolegt",
    title: "Rólegur dagur",
    blurb: "Heitur pottur, sýning og bíó. Engin læti.",
    tone: "sea",
    window: [10 * 60, 24 * 60],
    stops: [
      { label: "Heitur pottur", minutes: 90, pick: (i) => i.kind === "pool" },
      { label: "Sýning", minutes: 75, pick: (i) => i.kind === "activity" && /sýning/i.test(i.categoryLabel), optional: true },
      { label: "Bíó", minutes: 120, pick: (i) => i.kind === "movie" },
    ],
  },
  {
    id: "fjor",
    title: "Fjör með vinahópnum",
    blurb: "Keppni, happy hour og tónleikar eða uppistand til að enda kvöldið.",
    tone: "coral",
    window: [14 * 60, 24 * 60],
    stops: [
      { label: "Keppni", minutes: 90, pick: isFun },
      { label: "Happy hour", minutes: 60, pick: (i) => i.kind === "happy_hour", optional: true },
      { label: "Tónleikar eða uppistand", minutes: 120, pick: (i) => i.kind === "event" && notKidsOnly(i) && (LOUD.test(tagText(i)) || i.music === true) },
    ],
  },
];

export interface Stop {
  label: string;
  item: FeedItem;
  start: string; // "14:00"
  end: string;
  travel: Travel | null; // from the previous stop (null for the first, or when a place isn't on the map)
}

export interface Outing {
  id: string;
  title: string;
  blurb: string;
  tone: Template["tone"];
  stops: Stop[];
  total: number; // known prices added up, per person
  unknownPrice: boolean; // some stop has no price (pools, most restaurants)
}

export type Day = "idag" | "amorgun";

export const DAYS: { id: Day; label: string }[] = [
  { id: "idag", label: "Í dag" },
  { id: "amorgun", label: "Á morgun" },
];

export interface OutingOptions {
  day: Day;
  date: string; // the chosen day, "2026-11-13"
  now: number; // minutes after midnight, from the server (only used for today)
  time: TimeOfDay;
  budget: Budget;
  /** Per outing: 0 = the best fit, 1 = the next best... ("Annað plan"). */
  variant: Record<string, number>;
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toClock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
/** Travel time to assume when a place isn't on the map. */
const UNKNOWN_TRAVEL = 15;
/** The longest gap allowed between two stops. */
const MAX_WAIT = 90;

/**
 * The earliest time `item` can start at or after `earliest`, and still
 * last `minutes`, or null when it can't on the chosen day.
 * For tomorrow we only know places' hours for today (or their next
 * opening), so those are used as a good guess.
 */
function startTime(item: FeedItem, earliest: number, minutes: number, opts: OutingOptions): number | null {
  switch (item.kind) {
    case "event": {
      if (item.dayKey !== opts.date || !item.startsAt) return null;
      const t = toMin(item.startsAt.slice(11, 16));
      return t >= earliest ? t : null;
    }
    case "movie": {
      if (item.dayKey !== opts.date) return null;
      const times = (item.showtimes ?? []).map((s) => toMin(s.time)).filter((t) => t >= earliest);
      return times.length ? Math.min(...times) : null;
    }
    case "idea":
      return earliest;
    case "pool":
    case "activity":
    case "restaurant":
    case "happy_hour": {
      if (!item.timeLabel || (opts.day === "idag" && item.dayLabel === "á morgun")) return null;
      if (item.timeLabel === "Allan daginn") return earliest;
      const [open, close] = item.timeLabel.split("–").map(toMin);
      const closes = close === 0 ? 24 * 60 : close;
      const start = Math.max(earliest, open);
      return start + Math.min(minutes, 60) <= closes ? start : null; // at least an hour before closing
    }
    default:
      return null; // deals are vouchers, not something on at a time
  }
}

function fitsBudget(price: number | null, spent: number, budget: Budget): boolean {
  if (budget === "allt") return true;
  if (budget === "0") return price === 0;
  return price == null || spent + price <= Number(budget);
}

/**
 * Fill the template's stops in order. Optional stops are tried both
 * ways (with and without), since a dinner can block a show that starts
 * soon; the version with the most stops wins.
 */
function build(template: Template, items: FeedItem[], opts: OutingOptions): Outing | null {
  const [winFrom, winTo] = WINDOWS[opts.time];
  const from = Math.max(template.window[0], winFrom, opts.day === "idag" ? Math.ceil(opts.now / 15) * 15 : 0);
  const to = Math.min(template.window[1], winTo);
  if (to - from < 120) return null; // this outing doesn't fit the chosen time of day (or what's left of today)

  // Optional stops are tried both ways (a dinner can block a show that
  // starts soon), and the first stop at every hour of the window, so the
  // stops sit close together instead of with hours of waiting between.
  const optional = template.stops.map((s, i) => (s.optional ? i : -1)).filter((i) => i >= 0);
  let best: { outing: Outing; wait: number } | null = null;
  for (let mask = 0; mask < 1 << optional.length; mask++) {
    const skip = new Set(optional.filter((_, bit) => mask & (1 << bit)));
    const slots = template.stops.filter((_, i) => !skip.has(i));
    for (let start = from; start <= to - 120; start += 60) {
      const result = buildWith(template, slots, items, opts, start, to);
      if (!result) continue;
      const more = !best || result.outing.stops.length > best.outing.stops.length;
      const same = best && result.outing.stops.length === best.outing.stops.length;
      if (more || (same && result.wait < best!.wait)) best = result;
    }
  }
  return best?.outing ?? null;
}

function buildWith(
  template: Template,
  slots: Slot[],
  items: FeedItem[],
  opts: OutingOptions,
  from: number,
  to: number,
): { outing: Outing; wait: number } | null {
  const variant = opts.variant[template.id] ?? 0;
  let cursor = from;
  let wait = 0; // minutes spent waiting between stops
  let previous: FeedItem | null = null;
  let spent = 0;
  let unknownPrice = false;
  const used = new Set<string>();
  const stops: Stop[] = [];

  for (const slot of slots) {
    const options: { item: FeedItem; start: number; earliest: number; travel: Travel | null; score: number }[] = [];
    for (const item of items) {
      if (used.has(item.id) || used.has(item.title) || !slot.pick(item)) continue;
      const price = priceValue(item);
      if (!fitsBudget(price, spent, opts.budget)) continue;
      const travel = previous ? travelBetween(previous, item) : null;
      const earliest = cursor + (previous ? (travel?.minutes ?? UNKNOWN_TRAVEL) : 0);
      const start = startTime(item, earliest, slot.minutes, opts);
      if (start == null || start + Math.min(slot.minutes, 60) > to) continue;
      if (previous && start - earliest > MAX_WAIT) continue; // nobody wants two hours of nothing
      // Less waiting and less travel is better; pictures make the plan nicer to look at.
      const score = (start - earliest) + (travel ? travel.minutes * 1.5 : previous ? 20 : 0) + (item.imageUrl ? 0 : 15);
      options.push({ item, start, earliest, travel, score });
    }
    if (options.length === 0) return null; // (optional stops are left out by build() instead)
    options.sort((a, b) => a.score - b.score);
    const chosen = options[variant % Math.min(options.length, 4)];
    const price = priceValue(chosen.item);
    if (price == null) unknownPrice = true;
    else spent += price;
    used.add(chosen.item.id).add(chosen.item.title);
    stops.push({
      label: slot.label,
      item: chosen.item,
      start: toClock(chosen.start),
      end: toClock(chosen.start + slot.minutes),
      travel: chosen.travel,
    });
    if (previous) wait += chosen.start - chosen.earliest;
    cursor = chosen.start + slot.minutes;
    previous = chosen.item;
  }

  if (stops.length < 2) return null;
  const { id, title, blurb, tone } = template;
  return { outing: { id, title, blurb, tone, stops, total: spent, unknownPrice }, wait };
}

/** Every outing that can still be done on the chosen day with the chosen time and budget. */
export function buildOutings(items: FeedItem[], opts: OutingOptions): Outing[] {
  return TEMPLATES.map((t) => build(t, items, opts)).filter((o): o is Outing => o !== null);
}
