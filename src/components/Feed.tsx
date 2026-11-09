"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { DetailDialog } from "./DetailDialog";
import { Icon } from "./Icon";
import { PostCard } from "./PostCard";
import { useSaved } from "./SavedProvider";

interface FeedProps {
  items: FeedItem[];
  updatedLabel: string; // "í dag kl. 13:47"
  sources: string[];
}

/** "Fyrir þig": the photo feed from the AI concept, with real data. */
export function Feed({ items, updatedLabel, sources }: FeedProps) {
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<FeedItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { requestRandom } = useSaved();

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

  // "/" focuses the search, like in the concept.
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

  // Story circles use a real photo from each category.
  const storyImage = (id: FeedCategory) => items.find((i) => i.category === id && i.imageUrl)?.imageUrl;
  const openNow = items.filter((i) => i.isLive && (i.kind === "pool" || i.kind === "activity" || i.kind === "happy_hour"));

  return (
    <div className="feed-layout">
      <div className="feed-column">
        <div className="stories-bar">
          <div className="category-filters" aria-label="Flokka eftir áhuga">
            <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
              <span className="story-thumbnail">
                <Icon name="spark" />
              </span>
              <span className="story-label">Allt</span>
            </button>
            {CATEGORIES.map((c) => {
              const image = storyImage(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  <span className="story-thumbnail">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" />
                    ) : (
                      <Icon name="spark" />
                    )}
                  </span>
                  <span className="story-label">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="discovery-section" aria-labelledby="discover-title">
          <div className="feed-toolbar">
            <div className="feed-tabs">
              <h1 id="discover-title">Fyrir þig</h1>
              <Link href="/events">Viðburðir</Link>
            </div>
            <label className="search-field">
              <Icon name="search" />
              <input
                ref={searchRef}
                type="search"
                placeholder="Leita…"
                aria-label="Leita að tilboði, viðburði eða stað"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>/</kbd>
            </label>
          </div>
          <div className="feed-context">
            <span>
              <span className="live-dot" />
              Góðar hugmyndir í Reykjavík í dag
            </span>
            <span className="results-count" role="status" aria-live="polite">
              {visible.length} {visible.length === 1 ? "hugmynd" : "hugmyndir"}
            </span>
          </div>

          {visible.length > 0 ? (
            <div className="offer-grid">
              {visible.map((item) => (
                <PostCard key={item.id} item={item} onOpen={setOpen} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name="search" />
              </span>
              <h2>Ekkert plan fannst í þetta sinn.</h2>
              <p>Prófaðu annað leitarorð eða skoðaðu alla flokka.</p>
              <button
                className="button button-dark"
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
        </section>

        <div className="feed-end">
          <Icon name="check" />
          <strong>Þú ert með allar hugmyndirnar.</strong>
          <p>Næsta skref? Veldu eitthvað skemmtilegt.</p>
          <button className="text-button" type="button" onClick={openRandom}>
            Veldu fyrir mig
            <Icon name="spark" />
          </button>
        </div>
      </div>

      <aside className="feed-aside" aria-label="Fleiri hugmyndir">
        <div className="feed-welcome">
          <span className="welcome-symbol">
            <Icon name="spark" />
          </span>
          <div>
            <strong>Góður dagur byrjar hér.</strong>
            <p>Finndu þitt næsta plan.</p>
          </div>
        </div>

        <section className="aside-random">
          <span className="aside-random-symbol" aria-hidden="true">
            <Icon name="spark" />
          </span>
          <span className="eyebrow">EKKERT ÁKVEÐIÐ?</span>
          <h2>
            Látum daginn
            <br />
            koma á óvart.
          </h2>
          <p>Smá tilviljun gæti orðið að besta plani dagsins.</p>
          <button className="button button-dark" type="button" onClick={openRandom}>
            Veldu fyrir mig
            <Icon name="arrow" />
          </button>
        </section>

        {openNow.length > 0 && (
          <section className="aside-places">
            <div className="aside-heading">
              <h2>Opið núna</h2>
              <Link href="/map">Sjá á korti</Link>
            </div>
            {openNow.slice(0, 4).map((place) => (
              <button key={place.id} className="aside-place" type="button" onClick={() => setOpen(place)}>
                {place.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={place.imageUrl} alt="" />
                ) : (
                  <span className="aside-place-icon">
                    <Icon name="spark" />
                  </span>
                )}
                <span>
                  <strong>{place.kind === "happy_hour" ? place.place : place.title}</strong>
                  <small>{place.whenLabel}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </section>
        )}

        <Link className="aside-plan" href="/plan">
          <Icon name="calendar" />
          <span>
            <strong>Þitt eigið plan</strong>
            <small>Hugmyndirnar sem þú vilt gera að veruleika.</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <p className="aside-disclaimer">
          Gögn sótt {updatedLabel}
          <br />
          frá {sources.join(", ")}
        </p>
      </aside>

      <button className="mobile-random" type="button" onClick={requestRandom} aria-label="Veldu fyrir mig">
        <Icon name="spark" />
        Veldu fyrir mig
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
