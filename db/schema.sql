-- =====================================================================
-- Hvað á að gera í dag? — database schema
--
-- The scraper writes into these tables and the Next.js site reads from
-- them (mostly through the views at the bottom).
--
-- Dialect: SQLite. It is kept close to standard SQL so it can be moved
-- to PostgreSQL later (e.g. for hosting) with small changes:
--   INTEGER PRIMARY KEY  -> integer GENERATED ALWAYS AS IDENTITY
--   TEXT timestamps      -> timestamptz
--   strftime(...)        -> now()
--
-- Every statement is idempotent (IF NOT EXISTS) so this file is simply
-- run on every start-up.
--
-- NOTE while we are in early development: CREATE TABLE IF NOT EXISTS
-- does not change a table that already exists. After changing a table
-- here, delete data/hvad.db and run `npm run scrape` again (the data is
-- all re-scrapable). Views are dropped and re-created every time, so
-- changing a view needs no reset.
--
-- All timestamps are stored as ISO-8601 UTC strings, e.g.
-- '2026-11-09T20:00:00Z'. Iceland is on UTC all year (no daylight
-- saving), so UTC == local time here.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Websites we scrape.
CREATE TABLE IF NOT EXISTS sources (
  id          INTEGER PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,          -- 'tix', 'kvikmyndir', 'hopkaup'
  name        TEXT    NOT NULL,                 -- 'Tix.is'
  base_url    TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Physical places: cinemas, concert halls, restaurants, pools...
-- lat/lng are nullable for now; filling them in enables "nálægt mér".
CREATE TABLE IF NOT EXISTS venues (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  address  TEXT,
  lat      REAL,
  lng      REAL,
  url      TEXT
);

-- One row per "thing to do": a movie, an event, a deal...
-- (source_id, external_id) identifies the row on the source website, so
-- re-running the scraper updates rows instead of duplicating them.
CREATE TABLE IF NOT EXISTS items (
  id                  INTEGER PRIMARY KEY,
  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id         TEXT    NOT NULL,
  category            TEXT    NOT NULL CHECK (category IN (
                        'movie',          -- bíó
                        'event',          -- tónleikar, leikhús, viðburðir
                        'food_deal',      -- afsláttur á matarstöðum
                        'activity_deal',  -- upplifun / afþreying á tilboði
                        'activity',       -- afþreying með opnunartíma (lasertag, leiktæki...)
                        'pool',           -- sundlaugar
                        'happy_hour',
                        'idea'            -- okkar eigin hugmyndir (scraper/content/ideas.ts)
                      )),
  title               TEXT    NOT NULL,
  -- Normalised title used to merge the same movie from different
  -- sources, e.g. "Iceguys – kvikmyndin" and "IceGuys the Movie" -> "iceguys".
  match_key           TEXT,
  subtitle            TEXT,               -- genre, short tagline...
  description         TEXT,
  url                 TEXT    NOT NULL,   -- where the user goes to read more / book
  image_url           TEXT,
  provider            TEXT,               -- who offers it, e.g. restaurant name
  venue_id            INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  price_isk           INTEGER,            -- current price in krónur
  original_price_isk  INTEGER,            -- price before discount
  discount_percent    INTEGER CHECK (discount_percent BETWEEN 0 AND 100),
  tags                TEXT,               -- comma separated, e.g. 'Tónlist,Rokk'
  valid_from          TEXT,               -- for deals
  valid_until         TEXT,               -- for deals
  first_seen_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS items_category_idx  ON items (category);
CREATE INDEX IF NOT EXISTS items_last_seen_idx ON items (last_seen_at);
CREATE INDEX IF NOT EXISTS items_match_key_idx ON items (match_key);

-- When something happens: movie showtimes, event dates.
-- Deals usually have no occurrences (they are valid for a period).
CREATE TABLE IF NOT EXISTS occurrences (
  id         INTEGER PRIMARY KEY,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  starts_at  TEXT    NOT NULL,
  ends_at    TEXT,
  venue_id   INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  url        TEXT,      -- e.g. direct ticket link for this showtime
  note       TEXT,      -- e.g. 'Salur 3'
  UNIQUE (item_id, starts_at, venue_id)
);

CREATE INDEX IF NOT EXISTS occurrences_starts_at_idx ON occurrences (starts_at);

-- Log of every scraper run, handy for debugging ("why is tix empty?").
CREATE TABLE IF NOT EXISTS scrape_runs (
  id           INTEGER PRIMARY KEY,
  source_id    INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  finished_at  TEXT,
  status       TEXT    NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  items_found  INTEGER NOT NULL DEFAULT 0,
  error        TEXT
);

-- =====================================================================
-- Views — the website queries these instead of the raw tables.
-- =====================================================================

-- Items that are still on the source website: seen in the source's most
-- recent *successful* scrape. Something removed from the site disappears
-- after the next successful run, while a failed run hides nothing.
-- Data older than 3 days is hidden too, in case a scraper keeps failing.
DROP VIEW IF EXISTS v_current_items;
CREATE VIEW v_current_items AS
SELECT i.*
FROM items i
JOIN (
  SELECT source_id, MAX(started_at) AS last_ok_run
  FROM scrape_runs
  WHERE status = 'ok'
  GROUP BY source_id
) r ON r.source_id = i.source_id
WHERE i.last_seen_at >= r.last_ok_run
  AND r.last_ok_run >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days');

-- Everything that happens from now on, one row per occurrence.
DROP VIEW IF EXISTS v_upcoming;
CREATE VIEW v_upcoming AS
SELECT
  o.id                          AS occurrence_id,
  i.id                          AS item_id,
  i.category,
  i.title,
  i.match_key,
  i.subtitle,
  i.url                         AS item_url,
  COALESCE(o.url, i.url)        AS url,
  i.image_url,
  i.price_isk,
  i.tags,
  o.starts_at,
  o.ends_at,
  o.note,
  COALESCE(ov.name, iv.name)    AS venue_name,
  COALESCE(ov.lat,  iv.lat)     AS lat,
  COALESCE(ov.lng,  iv.lng)     AS lng,
  s.name                        AS source_name
FROM occurrences o
JOIN v_current_items i ON i.id = o.item_id
JOIN sources s  ON s.id  = i.source_id
LEFT JOIN venues ov ON ov.id = o.venue_id
LEFT JOIN venues iv ON iv.id = i.venue_id
WHERE o.starts_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now');

-- Only what is still left today ("Hvað á að gera í dag?").
DROP VIEW IF EXISTS v_today;
CREATE VIEW v_today AS
SELECT * FROM v_upcoming
WHERE substr(starts_at, 1, 10) = strftime('%Y-%m-%d', 'now');

-- Places with opening hours (pools, happy hours, activities) that are
-- open now or open later today. Unlike v_upcoming, a time slot counts
-- until it *ends*, so a pool that opened at 06:30 still shows at noon.
-- With several slots in a day, the current/next one comes first.
DROP VIEW IF EXISTS v_open_today;
CREATE VIEW v_open_today AS
SELECT
  o.id                          AS occurrence_id,
  i.id                          AS item_id,
  i.category,
  i.title,
  i.subtitle,
  i.description,
  i.provider,
  i.url,
  i.image_url,
  o.starts_at,
  o.ends_at,
  o.note,
  (o.starts_at <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) AS is_open_now,
  v.name                        AS venue_name,
  v.address,
  v.lat,
  v.lng
FROM occurrences o
JOIN v_current_items i ON i.id = o.item_id
LEFT JOIN venues v ON v.id = COALESCE(o.venue_id, i.venue_id)
WHERE i.category IN ('pool', 'happy_hour', 'activity')
  AND o.ends_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  AND substr(o.starts_at, 1, 10) <= strftime('%Y-%m-%d', 'now')
ORDER BY o.starts_at;

-- Deals that are currently on offer, best discount first.
DROP VIEW IF EXISTS v_active_deals;
CREATE VIEW v_active_deals AS
SELECT
  i.id          AS item_id,
  i.category,
  i.title,
  i.provider,
  i.url,
  i.image_url,
  i.price_isk,
  i.original_price_isk,
  i.discount_percent,
  i.valid_until,
  s.name        AS source_name
FROM v_current_items i
JOIN sources s ON s.id = i.source_id
WHERE i.category IN ('food_deal', 'activity_deal')
  AND (i.valid_until IS NULL OR i.valid_until >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ORDER BY i.discount_percent DESC, i.price_isk ASC;
