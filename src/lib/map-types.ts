// Shapes for the map page, shared by the server (which builds them from
// the database) and the map component. No server-only imports here.

import type { Audience } from "./feed-types";

/** What a pin is about; also the map's filter buttons and pin colours. */
export type MapGroup = "vidburdir" | "sund" | "matur" | "afthreying" | "bio";

export const MAP_GROUPS: { id: MapGroup; label: string }[] = [
  { id: "vidburdir", label: "Viðburðir" },
  { id: "sund", label: "Sund" },
  { id: "matur", label: "Matur & drykkur" },
  { id: "afthreying", label: "Afþreying" },
  { id: "bio", label: "Bíó" },
];

/** One thing at a place: an event, a pool, a happy hour... */
export interface MapItem {
  id: number;
  group: MapGroup;
  title: string;
  detail: string | null; // "lau. 21. nóv. kl. 20:00", "Útisundlaug 25×12 metrar"
  url: string;
  imageUrl: string | null;
  minAge: number | null;
  audience: Audience | null;
  kind?: "movie"; // only set for movies (the age filter treats unrated movies specially)
}

/**
 * A place with everything that is there. Places without coordinates
 * (`lat`/`lng` null) are listed next to the map but have no pin.
 */
export interface MapPlace {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  items: MapItem[];
}
