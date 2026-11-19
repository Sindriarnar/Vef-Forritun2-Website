import "./env";
import { getDb } from "../src/lib/db";
import { PoliteHttp } from "./lib/http";
import { inIceland } from "./lib/geo";

const BASE = "https://api.geoapify.com";
const MIN_CONFIDENCE = 0.65;

interface VenueRow {
  id: number;
  name: string;
  address: string | null;
}

interface GeoapifyResult {
  lat: number;
  lon: number;
  name?: string;
  address_line1?: string;
  formatted?: string;
  result_type?: string;
  country_code?: string;
  street?: string;
  housenumber?: string;
  rank?: { confidence?: number };
}

async function main() {
  const apiKey = readApiKey();

  const db = getDb();
  const http = new PoliteHttp();
  http.setHostDelay(BASE, 1000);

  const venues = db
    .prepare(
      `SELECT DISTINCT v.id, v.name, v.address
         FROM v_current_items i
         JOIN occurrences o ON o.item_id = i.id
         JOIN venues v ON v.id = COALESCE(o.venue_id, i.venue_id)
        WHERE i.category = 'event'
          AND (v.lat IS NULL OR v.lng IS NULL)
        ORDER BY v.name`,
    )
    .all() as VenueRow[];

  const getCached = db.prepare(`SELECT lat, lng FROM venue_geocode_cache WHERE query = ?`);
  const cacheResult = db.prepare(
    `INSERT INTO venue_geocode_cache (query, lat, lng, display_name)
     VALUES (@query, @lat, @lng, @displayName)
     ON CONFLICT (query) DO NOTHING`,
  );
  const saveCoords = db.prepare(
    `UPDATE venues SET lat = @lat, lng = @lng
      WHERE id = @id AND (lat IS NULL OR lng IS NULL)`,
  );

  let geocoded = 0;
  let cached = 0;
  const unmatched: string[] = [];

  try {
    for (const [index, venue] of venues.entries()) {
      const query = [venue.name, venue.address, "Iceland"].filter(Boolean).join(", ");
      const previous = getCached.get(query) as { lat: number | null; lng: number | null } | undefined;

      if (previous) {
        cached++;
        if (previous.lat !== null && previous.lng !== null) {
          saveCoords.run({ id: venue.id, lat: previous.lat, lng: previous.lng });
          geocoded++;
        } else {
          unmatched.push(venue.name);
        }
        continue;
      }

      const params = new URLSearchParams({
        text: query,
        format: "json",
        filter: "countrycode:is",
        limit: "5",
        apiKey,
      });

      let raw: string;
      try {
        raw = await http.getText(`${BASE}/v1/geocode/search?${params}`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Geoapify request failed: ${detail.replace(apiKey, "[redacted]")}`);
      }

      const response = JSON.parse(raw) as unknown;
      if (!response || typeof response !== "object" || !("results" in response) || !Array.isArray(response.results)) {
        throw new Error("Geoapify returned an invalid response");
      }

      const result = response.results
        .filter(isGeoapifyResult)
        .find((candidate) => validMatch(candidate, venue));
      const coords = result ? { lat: result.lat, lng: result.lon } : null;

      cacheResult.run({
        query,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        displayName: result?.formatted ?? null,
      });

      if (coords) {
        saveCoords.run({ id: venue.id, ...coords });
        geocoded++;
      } else {
        unmatched.push(venue.name);
      }

      if ((index + 1) % 10 === 0 || index + 1 === venues.length) {
        console.log(`  Geocoded ${index + 1}/${venues.length} event venues`);
      }
    }

    console.log(`Added coordinates to ${geocoded} event venues (${cached} reused from cache).`);
    if (unmatched.length) {
      console.warn(`No confident Iceland match for ${unmatched.length} venue(s): ${unmatched.join(", ")}`);
    }
  } finally {
    db.close();
  }
}

function readApiKey(): string {
  const args = process.argv.slice(2);
  let commandLineKey: string | undefined;

  for (let index = 0; index < args.length; index++) {
    if (args[index] !== "--api-key") {
      throw new Error("Unknown argument. Use --api-key <key>.");
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("Usage: npm run geocode:events -- --api-key <key>");
    }
    if (commandLineKey) throw new Error("Pass --api-key only once.");
    commandLineKey = value;
    index++;
  }

  const apiKey = commandLineKey ?? process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Set GEOAPIFY_API_KEY in .env.local or pass --api-key <key>.");
  }
  return apiKey;
}

function isGeoapifyResult(value: unknown): value is GeoapifyResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<GeoapifyResult>;
  return (
    typeof result.lat === "number" &&
    typeof result.lon === "number" &&
    typeof result.country_code === "string" &&
    typeof result.result_type === "string"
  );
}

function validMatch(result: GeoapifyResult, venue: VenueRow): boolean {
  const coords = { lat: result.lat, lng: result.lon };
  if (
    result.country_code !== "is" ||
    !inIceland(coords) ||
    (result.rank?.confidence ?? 0) < MIN_CONFIDENCE ||
    !["amenity", "building"].includes(result.result_type ?? "")
  ) {
    return false;
  }

  const venueKey = normalise(venue.name);
  if (
    venueKey &&
    [result.name, result.address_line1].some((value) => value && normalise(value) === venueKey)
  ) {
    return true;
  }

  const address = streetAddress(venue.address ?? venue.name);
  return Boolean(
    address &&
      normalise(result.street ?? "") === normalise(address.street) &&
      normalise(result.housenumber ?? "") === normalise(address.number),
  );
}

function streetAddress(value: string): { street: string; number: string } | null {
  const match = value.match(/^\s*(.+?)\s+(\d+[a-z]?)\s*(?:,|$)/i);
  return match ? { street: match[1], number: match[2] } : null;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
