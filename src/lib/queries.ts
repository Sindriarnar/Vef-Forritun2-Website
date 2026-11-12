import { connection } from "next/server";
import { getDb } from "./db";
import type { Audience } from "./feed-types";
import { altTitleKeys } from "./match";

/**
 * Read-only queries the website uses. They go through the SQL views in
 * db/schema.sql (v_upcoming, v_open_soon, v_active_deals,
 * v_current_items).
 *
 * better-sqlite3 is synchronous, so without `await connection()` Next.js
 * would run these queries once at build time and bake the result into
 * the page. `connection()` makes them run on every request instead, so
 * the site always shows what the scraper last stored.
 */

/** Who an item suits (items.min_age / items.audience, used by the age filter). */
interface AgeColumns {
  min_age: number | null;
  audience: Audience | null;
}

export interface DealRow extends AgeColumns {
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

export interface Movie extends AgeColumns {
  key: string; // match_key, or the item id if missing
  title: string;
  subtitle: string | null;
  image_url: string | null;
  item_url: string;
  source_name: string;
  showtimes: ShowtimeRow[];
}

/** The movies showing on one day ("2026-11-12"). */
export interface MovieDay {
  day: string;
  movies: Movie[];
}

export interface EventRow extends AgeColumns {
  item_id: number;
  title: string;
  image_url: string | null;
  item_url: string;
  venue_name: string | null;
  next_start: string; // the next start, or the first start on this row's day
  date_count: number; // how many days the event is on
  price_isk: number | null;
  tags: string | null;
  subtitle: string | null;
  source_name: string;
  // Only from getEventDays (one row per event per day):
  times_that_day?: number;
  day_number?: number; // 1 = the event's first day in the list
}

export interface OpenPlace extends AgeColumns {
  item_id: number;
  category: "pool" | "happy_hour" | "activity";
  title: string;
  subtitle: string | null;
  description: string | null;
  provider: string | null;
  url: string;
  image_url: string | null;
  price_isk: number | null;
  tags: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source_name: string;
  starts_at: string; // the current time slot, or the next one (today or tomorrow)
  ends_at: string;
  is_open_now: 0 | 1;
  is_tomorrow: 0 | 1;
}

export interface IdeaRow extends AgeColumns {
  item_id: number;
  external_id: string;
  title: string;
  description: string | null;
  url: string;
  tags: string | null;
}

/** One thing at one place, for the map (src/lib/map.ts groups them by place). */
export interface MapRow extends AgeColumns {
  venue_id: number;
  venue_name: string;
  address: string | null;
  lat: number | null; // null: we don't know where the place is (only pools are listed then)
  lng: number | null;
  item_id: number;
  category: string;
  title: string;
  subtitle: string | null;
  url: string;
  image_url: string | null;
  tags: string | null;
  next_start: string | null; // events and movies: the next date at this place
}

export async function getActiveDeals(limit = 80): Promise<DealRow[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT item_id, category, title, provider, url, image_url,
              price_isk, original_price_isk, discount_percent, source_name, min_age, audience
         FROM v_active_deals
        LIMIT ?`,
    )
    .all(limit) as DealRow[];
}

interface ShowtimeQueryRow extends AgeColumns {
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
}

/**
 * Movies with showtimes left today, and tomorrow's movies (so there is
 * something to show late in the evening). Days without showtimes are
 * left out.
 *
 * Movies are merged across sources: the same film from kvikmyndir.is,
 * Bíó Paradís and Smárabíó (same `match_key`) becomes one entry, and a
 * showtime listed by two sources (same time + cinema) is kept once,
 * preferring the cinema's own site (better ticket link/notes).
 */
export async function getMovieDays(): Promise<MovieDay[]> {
  await connection();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT item_id, match_key, title, subtitle, image_url, item_url, source_name,
              starts_at, venue_name, url, note, min_age, audience
         FROM v_upcoming
        WHERE category = 'movie'
          AND substr(starts_at, 1, 10) <= strftime('%Y-%m-%d', 'now', '+1 day')`,
    )
    .all() as ShowtimeQueryRow[];

  // Every current movie's key with its age rating (the strictest one, if
  // sources disagree). Bíó Paradís has no ratings, so its films get the
  // rating kvikmyndir.is gives the same film, even on a day when only
  // Bíó Paradís has showtimes for it.
  const ratings = new Map(
    (
      db
        .prepare(
          `SELECT match_key, MAX(min_age) AS min_age, MAX(audience) AS audience
             FROM v_current_items
            WHERE category = 'movie' AND match_key IS NOT NULL
            GROUP BY match_key`,
        )
        .all() as (AgeColumns & { match_key: string })[]
    ).map((r) => [r.match_key, r]),
  );

  const byDay = new Map<string, ShowtimeQueryRow[]>();
  for (const row of rows) {
    const day = row.starts_at.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  return [...byDay.keys()].sort().map((day) => ({ day, movies: mergeMovies(byDay.get(day)!, ratings) }));
}

function mergeMovies(rows: ShowtimeQueryRow[], ratings: Map<string, AgeColumns>): Movie[] {
  // Lower number = preferred. Cinemas' own sites first for showtimes,
  // kvikmyndir.is first for the movie title/poster (Icelandic titles).
  const showtimeRank = (source: string) => (source === "Kvikmyndir.is" ? 1 : 0);
  const infoRank = (source: string) => (source === "Kvikmyndir.is" ? 0 : 1);
  rows.sort((a, b) => showtimeRank(a.source_name) - showtimeRank(b.source_name));

  const movies = new Map<string, Movie>();
  const infoSource = new Map<string, number>();
  const seenShowtimes = new Set<string>();

  for (const row of rows) {
    const key = movieKey(row, ratings);
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
      const rating = ratings.get(key) ?? row;
      const own = (row.match_key ? ratings.get(row.match_key) : null) ?? row;
      const minAge = Math.max(rating.min_age ?? 0, own.min_age ?? 0) || null;
      // "Bönnuð innan 12 ára" or stricter is never a family film.
      const audience = minAge !== null && minAge >= 12 ? null : (rating.audience ?? own.audience);
      movie = { ...info, min_age: minAge, audience, showtimes: [] };
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

/**
 * The key movies are merged on: the row's match_key, except that a title
 * with a second title in brackets joins the movie another source lists
 * under one of the two: "Fjörður (Fjord)" (Bíó Paradís) is "Fjord"
 * (kvikmyndir.is).
 */
function movieKey(row: ShowtimeQueryRow, known: Map<string, unknown>): string {
  if (!row.match_key) return `item-${row.item_id}`;
  return altTitleKeys(row.title).find((key) => key !== row.match_key && known.has(key)) ?? row.match_key;
}

/** Upcoming events, one row per event with its next date (for the front page). */
export async function getUpcomingEvents({ limit = 60, withinDays = 60 } = {}): Promise<EventRow[]> {
  await connection();
  // SQLite returns the other columns from the row that has MIN(starts_at),
  // i.e. the venue of the *next* date.
  return getDb()
    .prepare(
      `SELECT item_id, title, image_url, item_url, venue_name, price_isk, tags, subtitle, source_name,
              min_age, audience,
              MIN(starts_at) AS next_start,
              COUNT(DISTINCT substr(starts_at, 1, 10)) AS date_count
         FROM v_upcoming
        WHERE category = 'event'
          AND starts_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+' || ? || ' days')
        GROUP BY item_id
        ORDER BY next_start
        LIMIT ?`,
    )
    .all(withinDays, limit) as EventRow[];
}

/**
 * Upcoming events for the events page: one row per event *per day it is
 * on*, so a show that runs for weeks is listed on every one of its days
 * (and "what's on the 21st?" finds it). No LIMIT: every day in the
 * period is complete.
 */
export async function getEventDays({ withinDays = 60 } = {}): Promise<EventRow[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT e.*,
              COUNT(*)     OVER (PARTITION BY item_id)                     AS date_count,
              ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY next_start) AS day_number
         FROM (
           SELECT item_id, title, image_url, item_url, venue_name, price_isk, tags, subtitle, source_name,
                  min_age, audience,
                  MIN(starts_at) AS next_start,     -- the first time that day
                  COUNT(*)       AS times_that_day
             FROM v_upcoming
            WHERE category = 'event'
              AND starts_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+' || ? || ' days')
            GROUP BY item_id, substr(starts_at, 1, 10)
         ) e
        ORDER BY next_start, title`,
    )
    .all(withinDays) as EventRow[];
}

/**
 * Pools / happy hours / activities with their current or next time slot:
 * open now first, then opening later today, then opening tomorrow.
 */
export async function getOpenSoon(categories: OpenPlace["category"][]): Promise<OpenPlace[]> {
  await connection();
  const placeholders = categories.map(() => "?").join(", ");
  // MIN(starts_at) picks each place's earliest slot that hasn't ended yet,
  // i.e. the current one if it is open now; SQLite returns the other
  // columns from that same row.
  return getDb()
    .prepare(
      `SELECT o.item_id, o.category, o.title, o.subtitle, o.description, o.provider, o.url,
              o.image_url, i.price_isk, i.tags, i.min_age, i.audience, o.address, o.lat, o.lng, s.name AS source_name,
              MIN(o.starts_at) AS starts_at, o.ends_at, o.is_open_now, o.is_tomorrow
         FROM v_open_soon o
         JOIN items i   ON i.id = o.item_id
         JOIN sources s ON s.id = i.source_id
        WHERE o.category IN (${placeholders})
        GROUP BY o.item_id
        ORDER BY o.is_open_now DESC, starts_at, o.title`,
    )
    .all(...categories) as OpenPlace[];
}

/** Our own ideas (scraper/content/ideas.ts) that are in season. */
export async function getIdeas(): Promise<IdeaRow[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT id AS item_id, external_id, title, description, url, tags, min_age, audience
         FROM v_current_items
        WHERE category = 'idea'`,
    )
    .all() as IdeaRow[];
}

/**
 * Everything current that can be shown on the map, one row per thing
 * per place:
 *  - events and movies: at each venue where they have an upcoming date
 *    (an event on tour is at several places)
 *  - pools, happy hours, activities, deals: at their own venue
 * Only places with coordinates, except pools, which are listed even
 * when we don't know where they are.
 */
export async function getMapRows(): Promise<MapRow[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT v.id AS venue_id, v.name AS venue_name, v.address, v.lat, v.lng,
              i.id AS item_id, i.category, i.title, i.subtitle, i.url, i.image_url, i.tags,
              i.min_age, i.audience, MIN(o.starts_at) AS next_start
         FROM occurrences o
         JOIN v_current_items i ON i.id = o.item_id
         JOIN venues v ON v.id = COALESCE(o.venue_id, i.venue_id)
        WHERE i.category IN ('event', 'movie')
          AND o.starts_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
          AND v.lat IS NOT NULL AND v.lng IS NOT NULL
        GROUP BY v.id, i.id

       UNION ALL

       SELECT v.id, v.name, v.address, v.lat, v.lng,
              i.id, i.category, i.title, i.subtitle, i.url, i.image_url, i.tags,
              i.min_age, i.audience, NULL
         FROM v_current_items i
         JOIN venues v ON v.id = i.venue_id
        WHERE i.category NOT IN ('event', 'movie', 'idea')
          AND ((v.lat IS NOT NULL AND v.lng IS NOT NULL) OR i.category = 'pool')

        ORDER BY next_start, title`,
    )
    .all() as MapRow[];
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
        WHERE s.base_url <> ''  -- our own ideas aren't a "source"
        ORDER BY s.name`,
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}
