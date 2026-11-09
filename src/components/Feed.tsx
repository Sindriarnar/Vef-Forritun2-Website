"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATEGORIES, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { DetailDialog } from "./DetailDialog";
import { MovieShelf, PlaceList, PlaceRow } from "./FeedModules";
import { Icon } from "./Icon";
import { IdeaCards } from "./IdeaCards";
import { PostCard } from "./PostCard";
import { useSaved } from "./SavedProvider";

interface FeedProps {
  items: FeedItem[];
  todayLabel: string; // "mánudagur 9. nóvember"
  updatedLabel: string; // "í dag kl. 13:47"
  sources: string[];
}

/** The front page: what's on today, as a feed with compact sections mixed in. */
export function Feed({ items, todayLabel, updatedLabel, sources }: FeedProps) {
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<FeedItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { plan, loaded, requestRandom } = useSaved();

  const visible = useMemo(() => {
    const q = normalise(query);
    return items.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!q || normalise(`${item.title} ${item.place} ${item.subtitle ?? ""} ${item.categoryLabel}`).includes(q)),
    );
  }, [items, category, query]);

  const openRandom = useCallback(() => {
    const pool = visible.length ? visible : items;
    if (pool.length) setOpen(pool[Math.floor(Math.random() * pool.length)]);
  }, [visible, items]);

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

  const posts = visible.filter((i) => i.kind === "deal" || i.kind === "event");
  const movies = visible.filter((i) => i.kind === "movie");
  const happyHours = visible.filter((i) => i.kind === "happy_hour");
  const activities = visible.filter((i) => i.kind === "activity");
  const pools = visible.filter((i) => i.kind === "pool");
  const ideas = visible.filter((i) => i.kind === "idea");
  // The sidebar shows the next few events (open places are already in the feed).
  const nextUp = items
    .filter((i) => i.kind === "event" && i.startsAt)
    .sort((a, b) => a.startsAt!.localeCompare(b.startsAt!))
    .slice(0, 5);
  const planCount = Object.keys(plan).length;
  const onlyIdeas = category === "hugmyndir";

  // Big posts with the compact sections slotted in between them.
  const modules: { after: number; node: ReactNode }[] = [
    { after: 0, node: <PlaceList key="activities" id="activities" title="Afþreying í dag" places={activities} onOpen={setOpen} /> },
    { after: 2, node: <MovieShelf key="movies" movies={movies} layout={posts.length ? "rail" : "grid"} onOpen={setOpen} /> },
    { after: 4, node: <IdeaCards key="ideas" ideas={ideas} limit={onlyIdeas ? undefined : 4} onOpen={setOpen} /> },
    { after: 6, node: <PlaceList key="happy" id="happy" title="Happy hour í dag" places={happyHours} onOpen={setOpen} /> },
    { after: 8, node: <PlaceList key="pools" id="pools" title="Sund í dag" places={pools} onOpen={setOpen} /> },
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

        <div className="stories" role="group" aria-label="Flokkar">
          <button type="button" className="story" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            <span className="story-ring">
              <Icon name="grid" />
            </span>
            Allt
          </button>
          {CATEGORIES.map((c) => {
            const image = items.find((i) => i.category === c.id && i.imageUrl)?.imageUrl;
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
                    <Icon name={c.id === "hugmyndir" ? "bulb" : "grid"} />
                  )}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>

        {visible.length > 0 ? (
          <div className="feed">{content}</div>
        ) : (
          <div className="empty">
            <h2>Ekkert fannst</h2>
            <p>Prófaðu annað leitarorð eða annan flokk.</p>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
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
