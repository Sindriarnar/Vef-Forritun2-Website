import type Database from "better-sqlite3";
import type { ScrapedItem, Source, VenueDetails } from "../types";
import { matchKey } from "./text";

type DB = Database.Database;

/** Inserts the source if it is new and returns its id. */
export function ensureSource(db: DB, source: Source): number {
  const row = db
    .prepare(
      `INSERT INTO sources (slug, name, base_url)
       VALUES (@slug, @name, @baseUrl)
       ON CONFLICT (slug) DO UPDATE SET name = excluded.name, base_url = excluded.base_url
       RETURNING id`,
    )
    .get({ slug: source.slug, name: source.name, baseUrl: source.baseUrl }) as { id: number };
  return row.id;
}

export function startRun(db: DB, sourceId: number): number {
  const result = db.prepare(`INSERT INTO scrape_runs (source_id) VALUES (?)`).run(sourceId);
  return Number(result.lastInsertRowid);
}

export function finishRun(
  db: DB,
  runId: number,
  outcome: { status: "ok" | "failed"; itemsFound: number; error?: string },
) {
  db.prepare(
    `UPDATE scrape_runs
        SET finished_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            status      = @status,
            items_found = @itemsFound,
            error       = @error
      WHERE id = @runId`,
  ).run({ runId, status: outcome.status, itemsFound: outcome.itemsFound, error: outcome.error ?? null });
}

/**
 * Saves scraped items in a single transaction:
 *  - items are upserted on (source_id, external_id), so re-running the
 *    scraper updates existing rows and bumps last_seen_at
 *  - an item's occurrences are replaced with the freshly scraped ones
 *  - venues are created on first sight; known details (address,
 *    coordinates) are filled in but never overwritten with NULL
 */
export function saveItems(db: DB, sourceId: number, items: ScrapedItem[]) {
  const upsertVenue = db.prepare(
    `INSERT INTO venues (name, address, lat, lng, url)
     VALUES (@name, @address, @lat, @lng, @url)
     ON CONFLICT (name) DO UPDATE SET
        address = COALESCE(excluded.address, venues.address),
        lat     = COALESCE(excluded.lat, venues.lat),
        lng     = COALESCE(excluded.lng, venues.lng),
        url     = COALESCE(excluded.url, venues.url)
     RETURNING id`,
  );

  const upsertItem = db.prepare(
    `INSERT INTO items (
        source_id, external_id, category, title, match_key, subtitle, description, url,
        image_url, provider, venue_id, price_isk, original_price_isk,
        discount_percent, tags, valid_from, valid_until
     ) VALUES (
        @sourceId, @externalId, @category, @title, @matchKey, @subtitle, @description, @url,
        @imageUrl, @provider, @venueId, @priceIsk, @originalPriceIsk,
        @discountPercent, @tags, @validFrom, @validUntil
     )
     ON CONFLICT (source_id, external_id) DO UPDATE SET
        category           = excluded.category,
        title              = excluded.title,
        match_key          = excluded.match_key,
        subtitle           = excluded.subtitle,
        description        = excluded.description,
        url                = excluded.url,
        image_url          = excluded.image_url,
        provider           = excluded.provider,
        venue_id           = excluded.venue_id,
        price_isk          = excluded.price_isk,
        original_price_isk = excluded.original_price_isk,
        discount_percent   = excluded.discount_percent,
        tags               = excluded.tags,
        valid_from         = excluded.valid_from,
        valid_until        = excluded.valid_until,
        last_seen_at       = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     RETURNING id`,
  );

  const deleteOccurrences = db.prepare(`DELETE FROM occurrences WHERE item_id = ?`);
  const insertOccurrence = db.prepare(
    `INSERT OR IGNORE INTO occurrences (item_id, starts_at, ends_at, venue_id, url, note)
     VALUES (@itemId, @startsAt, @endsAt, @venueId, @url, @note)`,
  );

  const venueId = (name: string | null | undefined, details: VenueDetails = {}): number | null => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const row = upsertVenue.get({
      name: trimmed,
      address: details.address ?? null,
      lat: details.lat ?? null,
      lng: details.lng ?? null,
      url: details.url ?? null,
    }) as { id: number };
    return row.id;
  };

  const saveAll = db.transaction((rows: ScrapedItem[]) => {
    for (const item of rows) {
      const { id: itemId } = upsertItem.get({
        sourceId,
        externalId: item.externalId,
        category: item.category,
        title: item.title,
        matchKey: matchKey(item.title),
        subtitle: item.subtitle ?? null,
        description: item.description ?? null,
        url: item.url,
        imageUrl: item.imageUrl ?? null,
        provider: item.provider ?? null,
        venueId: venueId(item.venue, item.venueDetails),
        priceIsk: item.priceIsk ?? null,
        originalPriceIsk: item.originalPriceIsk ?? null,
        discountPercent: item.discountPercent ?? null,
        tags: item.tags?.length ? item.tags.join(",") : null,
        validFrom: item.validFrom ?? null,
        validUntil: item.validUntil ?? null,
      }) as { id: number };

      deleteOccurrences.run(itemId);
      for (const occ of item.occurrences ?? []) {
        insertOccurrence.run({
          itemId,
          startsAt: occ.startsAt,
          endsAt: occ.endsAt ?? null,
          venueId: venueId(occ.venue),
          url: occ.url ?? null,
          note: occ.note ?? null,
        });
      }
    }
  });

  saveAll(items);
}
