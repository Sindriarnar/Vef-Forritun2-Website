import type { FeedItem } from "./feed-types";
import { formatDay, formatPrice, formatTime } from "./format";
import {
  getActiveDeals,
  getMoviesToday,
  getOpenToday,
  getUpcomingEvents,
  type DealRow,
  type EventRow,
  type MovieToday,
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
    subtitle: deal.provider ? `Hjá ${deal.provider}` : null,
    description: null,
    imageUrl: deal.image_url,
    url: deal.url,
    sourceName: deal.source_name,
    priceLabel: formatPrice(deal.price_isk),
    originalPriceLabel:
      deal.original_price_isk && deal.original_price_isk !== deal.price_isk
        ? formatPrice(deal.original_price_isk)
        : null,
    priceNote: "á tilboði",
    discountPercent: deal.discount_percent || null,
    tag: "Tilboð",
    whenLabel: "Gildir núna",
    isLive: true,
    startsAt: null,
  };
}

export function movieToItem(movie: MovieToday): FeedItem {
  const cinemas = [...new Set(movie.showtimes.map((s) => s.venue).filter(Boolean))] as string[];
  const next = movie.showtimes[0];
  return {
    id: `movie-${movie.key}`,
    kind: "movie",
    category: "bio",
    categoryLabel: "Bíó",
    place: cinemas.length > 2 ? `${cinemas.slice(0, 2).join(", ")} +${cinemas.length - 2}` : cinemas.join(", "),
    placeDetail: `${movie.showtimes.length} ${movie.showtimes.length === 1 ? "sýning" : "sýningar"} í dag`,
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
    tag: `${movie.showtimes.length} ${movie.showtimes.length === 1 ? "sýning" : "sýningar"} í dag`,
    whenLabel: next ? `Næsta sýning kl. ${formatTime(next.startsAt)}` : null,
    isLive: false,
    startsAt: next?.startsAt ?? null,
    showtimes: movie.showtimes.map((s) => ({
      time: formatTime(s.startsAt),
      venue: s.venue,
      note: s.note,
      url: s.url,
    })),
  };
}

export function eventToItem(event: EventRow): FeedItem {
  const when = `${formatDay(event.next_start)} kl. ${formatTime(event.next_start)}`;
  const price = formatPrice(event.price_isk);
  const firstTag = event.tags?.split(",")[0] ?? null;
  return {
    id: `event-${event.item_id}`,
    kind: "event",
    category: "vidburdir",
    categoryLabel: firstTag ?? "Viðburður",
    place: event.venue_name ?? event.source_name,
    placeDetail: event.date_count > 1 ? `${event.date_count} dagsetningar` : null,
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
    tag: formatDay(event.next_start),
    whenLabel: when,
    isLive: false,
    startsAt: event.next_start,
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
  const whenLabel = place.is_open_now
    ? happyHour
      ? `Í gangi til ${until}`
      : `Opið til ${until}`
    : happyHour
      ? `Byrjar kl. ${from}`
      : `Opnar kl. ${from}`;
  const price = formatPrice(place.price_isk);

  return {
    id: `${place.category}-${place.item_id}`,
    kind: place.category,
    category: kind.category,
    categoryLabel: kind.label,
    place: happyHour ? place.title : (place.provider ?? place.source_name),
    placeDetail: place.address,
    title: happyHour ? `Happy hour á ${place.title}` : place.title,
    subtitle: happyHour ? `${from}–${until} í dag` : place.subtitle,
    description: place.description,
    imageUrl: place.image_url,
    url: place.url,
    sourceName: place.source_name,
    priceLabel: price,
    originalPriceLabel: null,
    priceNote: price ? "frá" : null,
    discountPercent: null,
    tag: place.is_open_now ? (happyHour ? "Í gangi núna" : "Opið núna") : whenLabel,
    whenLabel,
    isLive: place.is_open_now === 1,
    startsAt: place.starts_at,
    lat: place.lat,
    lng: place.lng,
  };
}

/**
 * Everything for the "Fyrir þig" feed, mixed so the feed isn't 30 deals
 * in a row: one from each group in turn (deal, movie, place, event...).
 */
export async function getFeed(): Promise<FeedItem[]> {
  const [deals, movies, places, events] = await Promise.all([
    getActiveDeals(),
    getMoviesToday(),
    getOpenToday(["happy_hour", "pool", "activity"]),
    getUpcomingEvents({ limit: 20, withinDays: 2 }),
  ]);

  return interleave([
    deals.map(dealToItem),
    movies.map(movieToItem),
    places.map(placeToItem),
    events.map(eventToItem),
  ]);
}

export async function getEventItems(): Promise<FeedItem[]> {
  return (await getUpcomingEvents({ limit: 80, withinDays: 60 })).map(eventToItem);
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
