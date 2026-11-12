import { formatDay, formatTime } from "./format";
import type { MapGroup, MapItem, MapPlace } from "./map-types";
import { getMapRows, type MapRow } from "./queries";

/**
 * Everything for the map page: one entry per place (venue), with the
 * things that are there. Runs on the server.
 *
 * A place gets a pin when we know its coordinates. Those come from the
 * sources themselves: tix.is (its venues all over the country),
 * happyhour.is, and the map codes on some sundlaugar.is pages. Pools
 * without coordinates are still listed, just without a pin.
 */
export async function getMapPlaces(): Promise<MapPlace[]> {
  const places = new Map<number, MapPlace>();

  for (const row of await getMapRows()) {
    let place = places.get(row.venue_id);
    if (!place) {
      place = { id: row.venue_id, name: row.venue_name, address: row.address, lat: row.lat, lng: row.lng, items: [] };
      places.set(row.venue_id, place);
    }
    // The same pool can come from two sources (reykjavik.is and sundlaugar.is): keep one.
    if (place.items.some((item) => item.title.toLowerCase() === row.title.toLowerCase())) continue;
    place.items.push(toItem(row));
  }

  return [...places.values()].sort((a, b) => a.name.localeCompare(b.name, "is"));
}

function toItem(row: MapRow): MapItem {
  return {
    id: row.item_id,
    group: groupOf(row),
    title: row.title,
    detail: row.next_start ? `${formatDay(row.next_start)} kl. ${formatTime(row.next_start)}` : row.subtitle,
    url: row.url,
    imageUrl: row.image_url,
    minAge: row.min_age,
    audience: row.audience,
    ...(row.category === "movie" ? { kind: "movie" as const } : {}),
  };
}

function groupOf(row: MapRow): MapGroup {
  switch (row.category) {
    case "event":
      return "vidburdir";
    case "movie":
      return "bio";
    case "pool":
      return "sund";
    case "happy_hour":
    case "food_deal":
      return "matur";
    default:
      // activities and activity deals; restaurants are activities tagged "Veitingastaður"
      return row.tags?.split(",").includes("Veitingastaður") ? "matur" : "afthreying";
  }
}
