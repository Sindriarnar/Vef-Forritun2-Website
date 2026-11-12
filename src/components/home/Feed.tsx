"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATEGORIES, fitsAgeGroup, inCategory, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { AgeFilter, useAgeGroup } from "@/components/shared/AgeFilter";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { MovieShelf, PlaceList, PlaceRow } from "./FeedModules";
import { Icon } from "@/components/shared/Icon";
import { IdeaCards } from "./IdeaCards";
import { PostCard } from "./PostCard";
import { useSaved } from "@/components/shared/SavedProvider";

interface FeedProps {
  items: FeedItem[];
  todayLabel: string; // "mánudagur 9. nóvember"
  updatedLabel: string; // "í dag kl. 13:47"
  sources: string[];
}

/** How many events are shown as big posts (more are sent, so every age group gets its share). */
const MAX_EVENT_POSTS = 24;

/** "í dag", or "á morgun" when everything in the list opens tomorrow (late in the evening). */
const whenOpen = (places: FeedItem[]) =>
  places.length > 0 && places.every((p) => p.dayLabel === "á morgun") ? "á morgun" : "í dag";

/** The front page: what's on today, as a feed with compact sections mixed in. */
export function Feed({ items, todayLabel, updatedLabel, sources }: FeedProps) {
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<FeedItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { plan, loaded, requestRandom } = useSaved();
  const { age, setAge } = useAgeGroup();

  // Everything for the chosen age; the category and search filter this further.
  const forAge = useMemo(() => (age === "all" ? items : items.filter((item) => fitsAgeGroup(item, age))), [items, age]);

  const visible = useMemo(() => {
    const q = normalise(query);
    return forAge.filter(
      (item) =>
        (category === "all" || inCategory(item, category)) &&
        (!q || normalise(`${item.title} ${item.place} ${item.subtitle ?? ""} ${item.categoryLabel}`).includes(q)),
    );
  }, [forAge, category, query]);

  const openRandom = useCallback(() => {
    const pool = visible.length ? visible : forAge;
    if (pool.length) setOpen(pool[Math.floor(Math.random() * pool.length)]);
  }, [visible, forAge]);

  // "Veldu fyrir mig" from the header (event) or from another page (#random).
  useEffect(() => {
    const onRandom = () => openRandom();
    window.addEventListener("hvad:random", onRandom);
    if (window.location.hash === "#random") {
      history.replaceState(null, "", "/");
      onRandom();
    }
    return () => window.removeEventListener("hvad:random", onRandom);
  }, [openRandom]);

  // "/" focuses the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const posts: FeedItem[] = [];
  let eventPosts = 0;
  for (const item of visible) {
    if (item.kind === "deal") posts.push(item);
    // A search looks through every event; otherwise only the next few are shown.
    else if (item.kind === "event" && (query !== "" || eventPosts++ < MAX_EVENT_POSTS)) posts.push(item);
  }
  const movies = visible.filter((i) => i.kind === "movie");
  // One shelf per day: today, plus tomorrow when few or no showings are left today.
  const movieDays = [...new Set(movies.map((m) => m.dayKey))].map((day) => movies.filter((m) => m.dayKey === day));
  const happyHours = visible.filter((i) => i.kind === "happy_hour");
  const restaurants = visible.filter((i) => i.kind === "restaurant");
  const activities = visible.filter((i) => i.kind === "activity");
  const pools = visible.filter((i) => i.kind === "pool");
  const ideas = visible.filter((i) => i.kind === "idea");
  // The sidebar shows the next few events (open places are already in the feed).
  const nextUp = forAge
    .filter((i) => i.kind === "event" && i.startsAt)
    .sort((a, b) => a.startsAt!.localeCompare(b.startsAt!))
    .slice(0, 5);
  const planCount = Object.keys(plan).length;
  const onlyIdeas = category === "hugmyndir";

  // Big posts with the compact sections slotted in between them.
  const modules: { after: number; node: ReactNode }[] = [
    { after: 0, node: <PlaceList key="activities" id="activities" title={`Afþreying ${whenOpen(activities)}`} places={activities} onOpen={setOpen} /> },
    ...movieDays.map((day) => ({
      after: 2,
      node: (
        <MovieShelf
          key={`movies-${day[0].dayKey}`}
          id={`movies-${day[0].dayKey}`}
          title={`Í bíó ${day[0].dayLabel ?? "í dag"}`}
          movies={day}
          layout={posts.length ? "rail" : "grid"}
          onOpen={setOpen}
        />
      ),
    })),
    { after: 4, node: <IdeaCards key="ideas" ideas={ideas} limit={onlyIdeas ? undefined : 4} onOpen={setOpen} /> },
    { after: 5, node: <PlaceList key="restaurants" id="restaurants" title={`Veitingastaðir ${whenOpen(restaurants)}`} places={restaurants} onOpen={setOpen} /> },
    { after: 6, node: <PlaceList key="happy" id="happy" title={`Happy hour ${whenOpen(happyHours)}`} places={happyHours} onOpen={setOpen} /> },
    { after: 8, node: <PlaceList key="pools" id="pools" title={`Sund ${whenOpen(pools)}`} places={pools} onOpen={setOpen} /> },
  ];
  const content: ReactNode[] = [];
  posts.forEach((post, i) => {
    content.push(<PostCard key={post.id} item={post} onOpen={setOpen} />);
    modules.filter((m) => m.after === i).forEach((m) => content.push(m.node));
  });
  modules.filter((m) => m.after >= posts.length).forEach((m) => content.push(m.node));

  return (
    <div className="feed-layout">
      <div className="feed-column">
        <div className="feed-head">
          <div>
            <h1>Í dag</h1>
            <p>{todayLabel}</p>
          </div>
          <label className="search">
            <Icon name="search" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Leita…"
              aria-label="Leita að bíói, tilboði eða stað"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
        </div>

        <AgeFilter hidden={items.length - forAge.length} />

        <div className="stories" role="group" aria-label="Flokkar">
          <button type="button" className="story" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            <span className="story-ring">
              <Icon name="grid" />
            </span>
            Allt
          </button>
          {CATEGORIES.map((c) => {
            const image = forAge.find((i) => inCategory(i, c.id) && i.imageUrl)?.imageUrl;
            return (
              <button
                key={c.id}
                type="button"
                className="story"
                aria-pressed={category === c.id}
                onClick={() => setCategory(category === c.id ? "all" : c.id)}
              >
                <span className="story-ring">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" />
                  ) : (
                    <Icon name={c.id === "hugmyndir" ? "bulb" : c.id === "tonlist" ? "music" : "grid"} />
                  )}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>

        {category === "tonlist" && (
          <p className="category-note">
            Tónleikar og önnur tónlist í dag og á morgun. <Link href="/events?tegund=tonlist">Sjá alla tónleika</Link>
          </p>
        )}

        {visible.length > 0 ? (
          <div className="feed">{content}</div>
        ) : (
          <div className="empty">
            <h2>Ekkert fannst</h2>
            <p>
              {age === "all"
                ? "Prófaðu annað leitarorð eða annan flokk."
                : "Prófaðu annað leitarorð, annan flokk eða annan aldurshóp."}
            </p>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setAge("all");
              }}
            >
              Sýna allt
            </button>
          </div>
        )}

        <p className="feed-end">
          Þetta er allt fyrir daginn. Síðast uppfært {updatedLabel}.
        </p>
      </div>

      <aside className="feed-aside" aria-label="Til hliðar">
        {nextUp.length > 0 && (
          <section className="aside-card">
            <div className="aside-head">
              <h2>Næst á dagskrá</h2>
              <Link href="/events">Allir viðburðir</Link>
            </div>
            <ul className="place-list compact">
              {nextUp.map((event) => (
                <li key={event.id}>
                  <PlaceRow place={event} onOpen={setOpen} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="aside-card">
          <h2>Getur ekki valið?</h2>
          <p>Við drögum eitthvað af handahófi úr því sem er í boði í dag.</p>
          <button className="btn btn-primary" type="button" onClick={openRandom}>
            <Icon name="dice" />
            Veldu fyrir mig
          </button>
        </section>

        <Link className="aside-card aside-link" href="/plan">
          <span>
            <strong>Planið þitt</strong>
            <small>
              {loaded && planCount > 0 ? `${planCount} atriði` : "Ekkert komið á planið enn"}
            </small>
          </span>
          <Icon name="chevron" />
        </Link>

        <p className="aside-note">
          Uppfært {updatedLabel}.
          <br />
          Heimildir: {sources.join(", ")}.
        </p>
      </aside>

      <button className="fab" type="button" onClick={requestRandom} aria-label="Veldu fyrir mig">
        <Icon name="dice" />
      </button>

      <DetailDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Lowercase without accents, so "sundholl" finds "Sundhöll". */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
