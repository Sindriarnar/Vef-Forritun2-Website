// Small helpers for FeedItems that both the front page and the sub pages
// use (collections, outings, the details dialog). Client-safe: no
// server-only imports.

import type { FeedItem } from "./feed-types";

/** The price in krónur: 0 when free, null when we don't know it. "frá 3.900 kr." -> 3900. */
export function priceValue(item: FeedItem): number | null {
  if (item.free) return 0;
  const digits = item.priceLabel?.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** "3.900 kr." */
export function formatKr(isk: number): string {
  return `${String(Math.round(isk)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} kr.`;
}

type Point = { lat?: number | null; lng?: number | null };

const hasPoint = (p: Point): p is { lat: number; lng: number } => p.lat != null && p.lng != null;

/** Straight-line distance in km, or null when either place has no coordinates. */
export function distanceKm(a: Point, b: Point): number | null {
  if (!hasPoint(a) || !hasPoint(b)) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export interface Travel {
  km: number;
  minutes: number;
  mode: "ganga" | "akstur";
  label: string; // "8 mín. ganga · 0,6 km"
}

/**
 * A rough guess at getting from a to b: walking (4.5 km/h, with a bit
 * extra because streets aren't straight lines) under 1.5 km, otherwise
 * driving at city speed plus parking. Null when a place isn't on the map.
 */
export function travelBetween(a: Point, b: Point): Travel | null {
  const km = distanceKm(a, b);
  if (km == null) return null;
  const street = km * 1.3;
  const walk = km < 1.5;
  const minutes = Math.max(2, Math.round(walk ? (street / 4.5) * 60 : (street / 30) * 60 + 5));
  const kmText = km < 10 ? km.toFixed(1).replace(".", ",") : String(Math.round(km));
  return { km, minutes, mode: walk ? "ganga" : "akstur", label: `${minutes} mín. ${walk ? "ganga" : "akstur"} · ${kmText} km` };
}

/** Lækjartorg, the middle of downtown Reykjavík. */
export const DOWNTOWN = { lat: 64.1474, lng: -21.9353 };

/** Downtown venues by name, for events whose venue we have no coordinates for. */
const DOWNTOWN_VENUES =
  /harpa|tjarnarbí|iðnó|gaukur|þjóðleikh|bíó paradís|kex|hressó|húrra|röntgen|mengi|listasafn reykjav|hafnarhús|kjarvalsst|dillon|lemmy|kaffibarinn|hlemm|grandi|nasa|fríkirkj|hallgríms/i;

/** In or near downtown Reykjavík (about 1.3 km from Lækjartorg). */
export function isDowntown(item: FeedItem): boolean {
  const km = distanceKm(item, DOWNTOWN);
  if (km != null) return km < 1.3;
  return DOWNTOWN_VENUES.test(`${item.place} ${item.placeDetail ?? ""}`);
}
