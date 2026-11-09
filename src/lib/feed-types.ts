// Shapes shared by the server (which builds them from the database) and
// the client components (which render, filter and save them).
// No server-only imports here.

/** The "story" circles at the top of the feed. */
export type FeedCategory = "matur" | "bio" | "vidburdir" | "afthreying" | "sund" | "hugmyndir";

export const CATEGORIES: { id: FeedCategory; label: string }[] = [
  { id: "afthreying", label: "Afþreying" },
  { id: "vidburdir", label: "Viðburðir" },
  { id: "bio", label: "Bíó" },
  { id: "matur", label: "Matur & drykkur" },
  { id: "sund", label: "Sund" },
  { id: "hugmyndir", label: "Hugmyndir" },
];

export interface Showtime {
  time: string; // "20:30"
  venue: string | null;
  note: string | null; // "Salur 3", "ENG SUB"
  url: string;
}

/** One post in the feed: a deal, a movie, an event, a pool... */
export interface FeedItem {
  id: string; // stable across scrapes, e.g. "deal-hopkaup-16191", "movie-iceguys"
  kind: "deal" | "movie" | "event" | "happy_hour" | "pool" | "activity" | "idea";
  category: FeedCategory;
  categoryLabel: string;
  place: string; // post header: who/where
  placeDetail: string | null; // address or extra place info
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  url: string; // the source page (info / booking)
  sourceName: string;
  priceLabel: string | null; // "1.425 kr."
  originalPriceLabel: string | null;
  priceNote: string | null; // "á tilboði", "frá"
  discountPercent: number | null;
  tag: string | null; // label on the image when there is no discount
  whenLabel: string | null; // "Opið til 22:00", "mið. 11. nóv. kl. 20:00"
  isLive: boolean; // open / happening right now
  startsAt: string | null; // next start, ISO
  timeLabel?: string | null; // "20:00"
  dayKey?: string | null; // "2026-11-11", for grouping by day
  dayHeading?: string | null; // "Á morgun", "Fimmtudagur 12. nóvember"
  dateParts?: { weekday: string; day: string; month: string } | null;
  tags?: string[]; // e.g. ideas: "Frítt", "Úti", "Vinahópur"
  showtimes?: Showtime[];
  lat?: number | null;
  lng?: number | null;
}
