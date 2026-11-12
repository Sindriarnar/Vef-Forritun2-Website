/**
 * Coordinates that a page already carries, read without asking any
 * geocoding service: Google Maps links and embeds often hold either
 * plain coordinates or a "plus code".
 */

export interface Coords {
  lat: number;
  lng: number;
}

/** Roughly Iceland with its islands; anything outside is a mistake (or 0,0). */
export function inIceland({ lat, lng }: Coords): boolean {
  return lat > 62.5 && lat < 67.5 && lng > -26 && lng < -12;
}

const PLUS_DIGITS = "23456789CFGHJMPQRVWX";

/**
 * A full Google plus code ("Open Location Code") -> the middle of the
 * small square it names, e.g. "9CM2XWRQ+7M" -> 63.9907, -19.0608
 * (Landmannalaugar). The code is the coordinates written in base 20:
 * five pairs of (latitude, longitude) digits, each pair 20 times finer
 * than the one before, optionally followed by digits for a 4x5 grid.
 * Short codes like "XWRQ+7M Reykjavík" need a place to start from and
 * aren't handled.
 */
export function decodePlusCode(code: string): Coords | null {
  const match = code.toUpperCase().trim().match(/^([23456789CFGHJMPQRVWX]{8})\+([23456789CFGHJMPQRVWX]{2,7})$/);
  if (!match) return null;
  const digits = [...(match[1] + match[2])].map((d) => PLUS_DIGITS.indexOf(d));

  let lat = -90;
  let lng = -180;
  let size = 20; // degrees per step in the current pair
  for (let pair = 0; pair < 5; pair++) {
    lat += digits[pair * 2] * size;
    lng += digits[pair * 2 + 1] * size;
    if (pair < 4) size /= 20;
  }
  let latSize = size;
  let lngSize = size;
  for (const digit of digits.slice(10)) {
    latSize /= 5;
    lngSize /= 4;
    lat += Math.floor(digit / 4) * latSize;
    lng += (digit % 4) * lngSize;
  }
  return { lat: round(lat + latSize / 2), lng: round(lng + lngSize / 2) };
}

/**
 * Coordinates from a Google Maps URL, if it has any:
 *   ...?q=9CM2XWRQ%2B7M      (plus code)
 *   ...?q=64.1403,-21.8766   (also ll=, center=)
 *   .../@64.1403,-21.8766,15z
 *   ...!3d64.1403!2d-21.8766 (embeds)
 * A URL that only has an address ("q=Skólastígur 4, Akureyri") gives null.
 */
export function coordsFromMapUrl(url: string | undefined | null): Coords | null {
  if (!url) return null;
  let text = url;
  try {
    text = decodeURIComponent(url);
  } catch {
    // keep the raw text
  }

  const query = text.match(/[?&](?:q|ll|center|query)=([^&]+)/)?.[1] ?? "";
  const candidates: (Coords | null)[] = [
    decodePlusCode(query.replace(/ /g, "+")), // "+" in a query string may arrive as a space
    pair(query.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/)),
    pair(text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)),
    pair(text.match(/!3d(-?\d{1,2}\.\d+)!(?:\dd[^!]*!)*?2d(-?\d{1,3}\.\d+)/)),
    flip(pair(text.match(/!2d(-?\d{1,3}\.\d+)!3d(-?\d{1,2}\.\d+)/))),
  ];
  return candidates.find((c): c is Coords => c !== null && inIceland(c)) ?? null;
}

function pair(match: RegExpMatchArray | null | undefined): Coords | null {
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
}

function flip(coords: Coords | null): Coords | null {
  return coords ? { lat: coords.lng, lng: coords.lat } : null;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
