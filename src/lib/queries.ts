import { connection } from "next/server";
import { getDb } from "./db";

/**
 * Read-only queries the website uses. They go through the SQL views in
 * db/schema.sql (v_today, v_upcoming, v_open_today, v_active_deals,
 * v_current_items).
 *
 * better-sqlite3 is synchronous, so without `await connection()` Next.js
 * would run these queries once at build time and bake the result into
 * the page. `connection()` makes them run on every request instead, so
 * the site always shows what the scraper last stored.
 */

export interface DealRow {
  item_id: number;
  category: "food_deal" | "activity_deal";
  title: string;
  provider: string | null;
  url: string;
  image_url: string | null;
  price_isk: number | null;
  original_price_isk: number | null;
  discount_percent: number | null;
  source_name: string;
}

export interface ShowtimeRow {
  startsAt: string;
  venue: string | null;
  url: string;
  note: string | null;
}

export interface MovieToday {
  key: string; // match_key, or the item id if missing
  title: string;
  subtitle: string | null;
  image_url: string | null;
  item_url: string;
  source_name: string;
  showtimes: ShowtimeRow[];
}

export interface EventRow {
  item_id: number;
  title: string;
  image_url: string | null;
  item_url: string;
  venue_name: string | null;
  next_start: string;
  date_count: number;
  price_isk: number | null;
  tags: string | null;
  subtitle: string | null;
  source_name: string;
}

export interface OpenPlace {
  item_id: number;
  category: "pool" | "happy_hour" | "activity";
  title: string;
  subtitle: string | null;
  description: string | null;
  provider: string | null;
  url: string;
  image_url: string | null;
  price_isk: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source_name: string;
  starts_at: string; // the current or next time slot today
  ends_at: string;
  is_open_now: 0 | 1;
}

export interface MapPlace {
  item_id: number;
  category: string;
  title: string;
  url: string;
  image_url: string | null;
  venue_name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export async function getActiveDeals(limit = 40): Promise<DealRow[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT item_id, category, title, provider, url, image_url,
              price_isk, original_price_isk, discount_percent, source_name
         FROM v_active_deals
        LIMIT ?`,
    )
    .all(limit) as DealRow[];
}

/**
 * Today's movies, merged across sources: the same film from
 * kvikmyndir.is, Bíó Paradís and Smárabíó (same `match_key`) becomes one
 * entry, and a showtime listed by two sources (same time + cinema) is
 * kept once, preferring the cinema's own site (better ticket link/notes).
 */
export async function getMoviesToday(): Promise<MovieToday[]> {
  await connection();
  const rows = getDb()
    .prepare(
      `SELECT item_id, match_key, title, subtitle, image_url, item_url, source_name,
              starts_at, venue_name, url, note
         FROM v_today
        WHERE category = 'movie'`,
    )
    .all() as {
    item_id: number;
    match_key: string | null;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    item_url: string;
    source_name: string;
    starts_at: string;
    venue_name: string | null;
    url: string;
    note: string | null;
  }[];

  // Lower number = preferred. Cinemas' own sites first for showtimes,
  // kvikmyndir.is first for the movie title/poster (Icelandic titles).
  const showtimeRank = (source: string) => (source === "Kvikmyndir.is" ? 1 : 0);
  const infoRank = (source: string) => (source === "Kvikmyndir.is" ? 0 : 1);
  rows.sort((a, b) => showtimeRank(a.source_name) - showtimeRank(b.source_name));

  const movies = new Map<string, MovieToday>();
  const infoSource = new Map<string, number>();
  const seenShowtimes = new Set<string>();

  for (const row of rows) {
    const key = row.match_key || `item-${row.item_id}`;
    const info = {
      key,
      title: row.title,
      subtitle: row.subtitle,
      image_url: row.image_url,
      item_url: row.item_url,
      source_name: row.source_name,
    };
    let movie = movies.get(key);
    if (!movie) {
      movie = { ...info, showtimes: [] };
      movies.set(key, movie);
      infoSource.set(key, infoRank(row.source_name));
    } else if (infoRank(row.source_name) < infoSource.get(key)!) {
      Object.assign(movie, info);
      infoSource.set(key, infoRank(row.source_name));
    }
    movie.image_url ??= row.image_url;
    movie.subtitle ??= row.subtitle;

    const showtimeKey = `${key}|${row.starts_at}|${row.venue_name}`;
    if (seenShowtimes.has(showtimeKey)) continue;
    seenShowtimes.add(showtimeKey);
    movie.showtimes.push({ startsAt: row.starts_at, venue: row.venue_name, url: row.url, note: row.note });
  }

  for (const movie of movies.values()) {
    movie.showtimes.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return [...movies.values()].sort(
    (a, b) => b.showtimes.length - a.showtimes.length || a.title.localeCompare(b.title, "is"),
  );
}

/** Upcoming events, one row per event with its next date. */
export async function getUpcomingEvents({ limit = 60, withinDays = 60 } = {}): Promise<EventRow[]> {
  await connection();
  // SQLite returns the other columns from the row that has MIN(starts_at),
  // i.e. the venue of the *next* date.
  return getDb()
    .prepare(
      `SELECT item_id, title, image_url, item_url, venue_name, price_isk, tags, subtitle, source_name,
              MIN(starts_at) AS next_start,
              COUNT(*)       AS date_count
         FROM v_upcoming
        WHERE category = 'event'
          AND starts_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+' || ? || ' days')
        GROUP BY item_id
        ORDER BY next_start
        LIMIT ?`,
    )
    .all(withinDays, limit) as EventRow[];
}

/** Pools / happy hours / activities that are open now or later today. */
export async function getOpenToday(categories: OpenPlace["category"][]): Promise<OpenPlace[]> {
  await connection();
  const placeholders = categories.map(() => "?").join(", ");
  // MIN(starts_at) picks each place's earliest slot that hasn't ended yet,
  // i.e. the current one if it is open now; SQLite returns the other
  // columns from that same row.
  return getDb()
    .prepare(
      `SELECT o.item_id, o.category, o.title, o.subtitle, o.description, o.provider, o.url,
              o.image_url, i.price_isk, o.address, o.lat, o.lng, s.name AS source_name,
              MIN(o.starts_at) AS starts_at, o.ends_at, o.is_open_now
         FROM v_open_today o
         JOIN items i   ON i.id = o.item_id
         JOIN sources s ON s.id = i.source_id
        WHERE o.category IN (${placeholders})
        GROUP BY o.item_id
        ORDER BY o.is_open_now DESC, starts_at, o.title`,
    )
    .all(...categories) as OpenPlace[];
}

/** Everything current that has coordinates, for the map. */
export async function getMapPlaces(): Promise<MapPlace[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT i.id AS item_id, i.category, i.title, i.url, i.image_url,
              v.name AS venue_name, v.address, v.lat, v.lng
         FROM v_current_items i
         JOIN venues v ON v.id = i.venue_id
        WHERE v.lat IS NOT NULL AND v.lng IS NOT NULL
        ORDER BY v.name`,
    )
    .all() as MapPlace[];
}

/** When the scraper last finished successfully (ISO string), or null. */
export async function getLastUpdated(): Promise<string | null> {
  await connection();
  const row = getDb()
    .prepare(`SELECT MAX(finished_at) AS last FROM scrape_runs WHERE status = 'ok'`)
    .get() as { last: string | null };
  return row.last;
}

/** Names of every source that has scraped successfully, for the footer. */
export async function getSourceNames(): Promise<string[]> {
  await connection();
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT s.name FROM sources s
         JOIN scrape_runs r ON r.source_id = s.id AND r.status = 'ok'
        ORDER BY s.name`,
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}
