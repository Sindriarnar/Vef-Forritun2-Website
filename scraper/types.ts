import type { PoliteHttp } from "./lib/http";

/** Must match the CHECK constraint on items.category in db/schema.sql. */
export type Category =
  | "movie"
  | "event"
  | "food_deal"
  | "activity_deal"
  | "activity"
  | "pool"
  | "happy_hour"
  | "idea";

/**
 * Must match the CHECK constraint on items.audience:
 * "born" = made for children, "fjolskylda" = good for the whole family.
 * See lib/ages.ts.
 */
export type Audience = "born" | "fjolskylda";

/** Extra facts about a venue; saved on the venues row when known. */
export interface VenueDetails {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  url?: string | null;
}

/** One showtime / date for an item. Timestamps are ISO-8601 UTC. */
export interface ScrapedOccurrence {
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  url?: string | null;
  note?: string | null;
}

/** What every source returns. The store layer turns these into SQL rows. */
export interface ScrapedItem {
  externalId: string;
  category: Category;
  title: string;
  url: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  provider?: string | null;
  venue?: string | null;
  venueDetails?: VenueDetails;
  priceIsk?: number | null;
  originalPriceIsk?: number | null;
  discountPercent?: number | null;
  tags?: string[];
  /**
   * Who it suits (lib/ages.ts). Leave both out to use the category's
   * default (e.g. happy hour = 20, pools = family).
   */
  minAge?: number | null;
  audience?: Audience | null;
  validFrom?: string | null;
  validUntil?: string | null;
  occurrences?: ScrapedOccurrence[];
}

/**
 * A website we scrape. To add a new one, create a file in
 * scraper/sources/ that exports a Source and register it in
 * scraper/sources/index.ts.
 */
export interface Source {
  slug: string;
  name: string;
  baseUrl: string;
  scrape(http: PoliteHttp): Promise<ScrapedItem[]>;
}
