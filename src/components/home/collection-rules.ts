import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { isDowntown, priceValue } from "@/lib/item-utils";
import { fitsWhen, mixKinds, type Calendar } from "./moods";

/**
 * Hand-picked rows above the main grid ("Helgin undir 5.000 kr.",
 * "Prófaðu eitthvað nýtt"...). Each is a rule over what's in the
 * database, so they fill themselves every day. A row needs at least
 * MIN_ITEMS to be shown. Add a row by adding an entry to RULES.
 */

export interface Collection {
  id: string;
  title: string;
  blurb: string;
  tone: "coral" | "plum" | "sun" | "sea" | "pink" | "green";
  items: FeedItem[];
}

const MIN_ITEMS = 3;
const MAX_ITEMS = 14;

const NEW_THINGS = /námskeið|handverk|uppistand|experimental|smiðj|vinnustof|spuna|tilraun|kynning|leiðsögn|upplestur|dans|jóga|bingó|pub quiz|spurningakeppni/i;
const tagText = (i: FeedItem) => `${i.categoryLabel} ${(i.tags ?? []).join(" ")} ${i.title}`;
const byTime = (a: FeedItem, b: FeedItem) => (a.startsAt ?? "~").localeCompare(b.startsAt ?? "~");
/** Items with a picture first: rows are visual. */
const withImagesFirst = (items: FeedItem[]) => [...items.filter((i) => i.imageUrl), ...items.filter((i) => !i.imageUrl)];

type Rule = Omit<Collection, "items"> & { pick(items: FeedItem[], cal: Calendar): FeedItem[] };

const RULES: Rule[] = [
  {
    id: "kvold-midbaer",
    title: "Kvöld í miðbænum",
    blurb: "Happy hour, matur og sýningar í göngufæri hvert frá öðru",
    tone: "plum",
    pick: (items, cal) => mixKinds(items.filter((i) => fitsWhen(i, "ikvold", cal) && isDowntown(i) && i.audience !== "born")),
  },
  {
    id: "helgin-5000",
    title: "Helgin undir 5.000 kr.",
    blurb: "Viðburðir og afþreying sem kosta minna en ein pítsa og bjór",
    tone: "coral",
    pick: (items, cal) =>
      mixKinds(
        items.filter((i) => {
          const price = priceValue(i);
          return (
            (i.kind === "event" || i.kind === "activity" || i.kind === "deal") &&
            fitsWhen(i, "helgin", cal) &&
            price != null &&
            price <= 5000
          );
        }),
      ),
  },
  {
    id: "nytt",
    title: "Prófaðu eitthvað nýtt",
    blurb: "Námskeið, uppistand, smiðjur og annað sem þú hefur kannski aldrei prófað",
    tone: "sun",
    pick: (items) =>
      mixKinds(
        items.filter(
          (i) =>
            (i.kind === "event" && NEW_THINGS.test(tagText(i))) ||
            (i.kind === "activity" && !/sýning|verslun/i.test(i.categoryLabel)) ||
            (i.kind === "deal" && i.category === "afthreying"),
        ),
      ),
  },
  {
    id: "tonleikar",
    title: "Tónleikar helgarinnar",
    blurb: "Frá sinfóníunni til bílskúrsbanda",
    tone: "pink",
    pick: (items, cal) => items.filter((i) => i.music && fitsWhen(i, "helgin", cal)).sort(byTime),
  },
  {
    id: "fjolskyldan",
    title: "Fjölskyldan um helgina",
    blurb: "Sýningar, smiðjur og afþreying fyrir alla aldurshópa",
    tone: "sea",
    pick: (items, cal) =>
      items
        .filter((i) => (i.kind === "event" || i.kind === "activity") && fitsAgeGroup(i, "fjolskylda") && fitsWhen(i, "helgin", cal))
        .sort(byTime),
  },
  {
    id: "tilbod",
    title: "Bestu tilboðin",
    blurb: "Mesti afslátturinn í dag",
    tone: "green",
    pick: (items) =>
      items.filter((i) => i.kind === "deal" && i.discountPercent).sort((a, b) => b.discountPercent! - a.discountPercent!),
  },
];

/** Every row with enough in it, for the items the age filter allows. */
export function buildCollections(items: FeedItem[], cal: Calendar): Collection[] {
  return RULES.map(({ pick, ...rest }) => {
    // One row per event: the weekend list can have the same show on several days.
    const seen = new Set<string>();
    const unique = pick(items, cal).filter((i) => {
      const key = `${i.kind}:${i.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...rest, items: withImagesFirst(unique).slice(0, MAX_ITEMS) };
  }).filter((c) => c.items.length >= MIN_ITEMS);
}
