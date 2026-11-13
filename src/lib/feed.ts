import type { FeedItem } from "./feed-types";
import { dateParts, formatDay, formatDayHeading, formatPrice, formatTime } from "./format";
import {
  getActiveDeals,
  getEventDays,
  getIdeas,
  getMovieDays,
  getOpenSoon,
  getUpcomingEvents,
  type DealRow,
  type EventRow,
  type IdeaRow,
  type Movie,
  type OpenPlace,
} from "./queries";

/**
 * Turns database rows into feed posts (FeedItem). Runs on the server;
 * all text is formatted here so the client only renders and filters.
 */

export function dealToItem(deal: DealRow): FeedItem {
  const food = deal.category === "food_deal";
  return {
    id: `deal-${deal.item_id}`,
    kind: "deal",
    category: food ? "matur" : "afthreying",
    categoryLabel: food ? "Matur & drykkur" : "Afþreying",
    place: deal.provider ?? deal.source_name,
    placeDetail: `Tilboð á ${deal.source_name}`,
    title: deal.title,
    subtitle: null,
    description: null,
    imageUrl: deal.image_url,
    url: deal.url,
    sourceName: deal.source_name,
    priceLabel: formatPrice(deal.price_isk),
    originalPriceLabel:
      deal.original_price_isk && deal.original_price_isk !== deal.price_isk
        ? formatPrice(deal.original_price_isk)
        : null,
    priceNote: null,
    discountPercent: deal.discount_percent || null,
    tag: null,
    whenLabel: null,
    isLive: false,
    startsAt: null,
    minAge: deal.min_age,
    audience: deal.audience,
  };
}

/** A movie on one day ("2026-11-12"): today, or tomorrow when today's showings are over. */
export function movieToItem(movie: Movie, day: string): FeedItem {
  const cinemas = [...new Set(movie.showtimes.map((s) => s.venue).filter(Boolean))] as string[];
  const next = movie.showtimes[0];
  const dayLabel = formatDay(`${day}T00:00:00Z`); // "í dag" / "á morgun"
  const today = dayLabel === "í dag";
  return {
    // Today's id has no date, so things saved before stay recognised.
    id: today ? `movie-${movie.key}` : `movie-${movie.key}-${day}`,
    kind: "movie",
    category: "bio",
    categoryLabel: "Bíó",
    place: cinemas.length > 2 ? `${cinemas.slice(0, 2).join(", ")} +${cinemas.length - 2}` : cinemas.join(", "),
    placeDetail: `${movie.showtimes.length} ${movie.showtimes.length === 1 ? "sýning" : "sýningar"} ${dayLabel}`,
    title: movie.title,
    subtitle: movie.subtitle,
    description: null,
    imageUrl: movie.image_url,
    url: movie.item_url,
    sourceName: movie.source_name,
    priceLabel: null,
    originalPriceLabel: null,
    priceNote: null,
    discountPercent: null,
    tag: null,
    whenLabel: next
      ? today
        ? `Næsta sýning kl. ${formatTime(next.startsAt)}`
        : `Fyrsta sýning ${dayLabel} kl. ${formatTime(next.startsAt)}`
      : null,
    isLive: false,
    startsAt: next?.startsAt ?? null,
    dayKey: day,
    dayLabel,
    minAge: movie.min_age,
    audience: movie.audience,
    showtimes: movie.showtimes.map((s) => ({
      time: formatTime(s.startsAt),
      venue: s.venue,
      note: s.note,
      url: s.url,
    })),
  };
}

/**
 * Tags that mean music, as tix.is and the library write them: "Tónleikar",
 * "Tónlist", "Jólatónleikar", "Rokk og popp", "Klassík", "Jazz og blús",
 * "Kór", "Sinfóníuhljómsveit", "Ópera"... ("Söngleikur", a musical, is theatre.)
 */
const MUSIC_TAG = /tónl|rokk|popp|jazz|djass|blús|klassík|kór|sinfón|óper|dægurl|lúðrasveit|diskó|rapp|tribute/i;

/**
 * A concert or other music event: it has a music tag, or "tónleikar" in
 * its name. Events made for children (the library tags sing-along hours
 * for toddlers as "Tónlist") only count when they are a concert.
 */
function isMusic(event: EventRow): boolean {
  const tags = event.tags?.split(",") ?? [];
  const concert = /tónleik/i.test(event.title) || tags.some((tag) => /tónleik/i.test(tag));
  return concert || (event.audience !== "born" && tags.some((tag) => MUSIC_TAG.test(tag)));
}

export function eventToItem(event: EventRow): FeedItem {
  const time = formatTime(event.next_start);
  const price = formatPrice(event.price_isk);
  const firstTag = event.tags?.split(",")[0] ?? null;
  const day = event.next_start.slice(0, 10);
  const times = event.times_that_day ?? 1;
  return {
    // On the events page an event has one row per day: the first day keeps
    // the plain id (the same as on the front page), later days add the date.
    id: (event.day_number ?? 1) === 1 ? `event-${event.item_id}` : `event-${event.item_id}-${day}`,
    kind: "event",
    category: "vidburdir",
    categoryLabel: firstTag ?? "Viðburður",
    place: event.venue_name ?? event.source_name,
    placeDetail:
      times > 1 ? `${times} tímar þennan dag` : event.date_count > 1 ? `${event.date_count} dagsetningar` : null,
    title: event.title,
    subtitle: event.subtitle,
    description: null,
    imageUrl: event.image_url,
    url: event.item_url,
    sourceName: event.source_name,
    priceLabel: price,
    originalPriceLabel: null,
    priceNote: price ? "frá" : null,
    discountPercent: null,
    tag: null,
    whenLabel: `${formatDay(event.next_start)} kl. ${time}`,
    isLive: false,
    startsAt: event.next_start,
    timeLabel: time,
    dayKey: day,
    dayHeading: formatDayHeading(event.next_start),
    dateParts: dateParts(event.next_start),
    tags: event.tags?.split(",").filter(Boolean),
    free: event.price_isk === 0,
    music: isMusic(event),
    minAge: event.min_age,
    audience: event.audience,
    lat: event.lat,
    lng: event.lng,
  };
}

const PLACE_KIND = {
  pool: { category: "sund", label: "Sund" },
  happy_hour: { category: "matur", label: "Happy hour" },
  activity: { category: "afthreying", label: "Afþreying" },
} as const;

export function placeToItem(place: OpenPlace): FeedItem {
  const kind = PLACE_KIND[place.category];
  const until = formatTime(place.ends_at);
  const from = formatTime(place.starts_at);
  const happyHour = place.category === "happy_hour";
  const tomorrow = place.is_tomorrow === 1;
  // "Opið allan daginn" is stored as a slot from midnight to midnight.
  const allDay = from === "00:00" && until === "00:00";
  const whenLabel = allDay
    ? tomorrow
      ? "Opið allan daginn á morgun"
      : "Opið allan daginn"
    : place.is_open_now
      ? happyHour
        ? `Í gangi til ${until}`
        : `Opið til ${until}`
      : tomorrow
        ? `Á morgun kl. ${from}`
        : happyHour
          ? `Byrjar kl. ${from}`
          : `Opnar kl. ${from}`;
  const price = formatPrice(place.price_isk);

  // Activities are told apart by a tag from the scraper: exhibitions,
  // shopping centres, and restaurants (which go under "Matur & drykkur").
  const tags = place.tags?.split(",") ?? [];
  const restaurant = tags.includes("Veitingastaður");
  const label = tags.includes("Sýning") ? "Sýning" : tags.includes("Verslun") ? "Verslun" : kind.label;

  return {
    id: `${place.category}-${place.item_id}`,
    kind: restaurant ? "restaurant" : place.category,
    category: restaurant ? "matur" : kind.category,
    categoryLabel: restaurant ? "Veitingastaður" : label,
    place: happyHour ? place.title : (place.provider ?? place.source_name),
    // A restaurant's line says where it is ("Garðurinn mathöll í Smáralind"), not the street.
    placeDetail: restaurant ? (place.subtitle ?? place.address) : place.address,
    title: place.title,
    subtitle: happyHour ? `Happy hour ${from}–${until}` : place.subtitle,
    description: place.description,
    imageUrl: place.image_url,
    url: place.url,
    sourceName: place.source_name,
    priceLabel: price,
    originalPriceLabel: null,
    priceNote: price ? "frá" : null,
    discountPercent: null,
    tag: null,
    whenLabel,
    // "Open all day" is the place's own wording, not a promise that it is open this minute.
    isLive: place.is_open_now === 1 && !allDay,
    startsAt: place.starts_at,
    timeLabel: allDay ? "Allan daginn" : `${from}–${until}`,
    dayLabel: tomorrow ? "á morgun" : "í dag",
    minAge: place.min_age,
    audience: place.audience,
    lat: place.lat,
    lng: place.lng,
  };
}

export function ideaToItem(idea: IdeaRow): FeedItem {
  const tags = idea.tags?.split(",").filter(Boolean) ?? [];
  let host = "";
  try {
    host = idea.url ? new URL(idea.url).hostname.replace(/^www\./, "") : "";
  } catch {
    // not a full URL: no link
  }
  return {
    id: `idea-${idea.external_id}`,
    kind: "idea",
    category: "hugmyndir",
    categoryLabel: "Hugmynd",
    place: "Hugmyndabankinn",
    placeDetail: tags.join(" · ") || null,
    title: idea.title,
    subtitle: null,
    description: idea.description,
    imageUrl: null,
    url: host ? idea.url : "",
    sourceName: host || "Hugmyndabankinn",
    priceLabel: null,
    originalPriceLabel: null,
    priceNote: null,
    discountPercent: null,
    tag: null,
    whenLabel: null,
    isLive: false,
    startsAt: null,
    tags,
    free: tags.includes("Frítt"),
    minAge: idea.min_age,
    audience: idea.audience,
  };
}

/** With fewer movies than this left today, tomorrow's movies are shown as well. */
const FEW_MOVIES_LEFT = 6;

/**
 * Everything for the front page. Deals and events are mixed so the feed
 * isn't 30 deals in a row; the rest is shown in compact sections.
 *
 * Late in the evening there is little left of today, so places show
 * their next opening (tomorrow) and tomorrow's movies are added.
 * More events are sent than are shown: the page picks the first ones
 * that fit the chosen age group (Feed.tsx).
 */
export async function getFeed(): Promise<FeedItem[]> {
  const [deals, movieDays, places, events, ideas] = await Promise.all([
    getActiveDeals(),
    getMovieDays(),
    getOpenSoon(["happy_hour", "pool", "activity"]),
    getUpcomingEvents({ limit: 80, withinDays: 2 }),
    getIdeas(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const leftToday = movieDays.find((d) => d.day === today)?.movies.length ?? 0;
  const movies = movieDays
    .filter((d) => d.day === today || leftToday < FEW_MOVIES_LEFT)
    .flatMap((d) => d.movies.map((movie) => movieToItem(movie, d.day)));

  return [
    ...interleave([deals.map(dealToItem), events.map(eventToItem)]),
    ...movies,
    ...places.map(placeToItem),
    ...shuffleForToday(ideas.map(ideaToItem)),
  ];
}

/** A different (but stable for the whole day) order of ideas each day. */
function shuffleForToday<T>(items: T[]): T[] {
  // Park–Miller generator seeded with today's date (stays within safe integers).
  let seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")) % 2147483647;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** The events page: every event on every day it is on, for the next 60 days. */
export async function getEventItems(): Promise<FeedItem[]> {
  return (await getEventDays({ withinDays: 60 })).map(eventToItem);
}

function interleave<T>(groups: T[][]): T[] {
  const result: T[] = [];
  const longest = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < longest; i++) {
    for (const group of groups) {
      if (i < group.length) result.push(group[i]);
    }
  }
  return result;
}
