"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** What you put on your plan, and what you saved. */
export function PlanView() {
  const { plan, favorites, loaded, togglePlan, toggleFavorite } = useSaved();
  const planItems = sortByTime(Object.values(plan));
  const favoriteItems = Object.values(favorites);

  return (
    <>
      <div className="page-head">
        <h1>Planið</h1>
        <p>Það sem þú hefur sett á planið eða vistað. Geymist bara í þessum vafra.</p>
      </div>

      <section className="plan-section" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="section-title">
          Á planinu <span>{loaded ? planItems.length : ""}</span>
        </h2>
        {loaded && planItems.length === 0 ? (
          <div className="empty empty-small">
            <p>Ekkert komið á planið. Ýttu á „Á planið“ við eitthvað sem þér líst á.</p>
            <Link className="btn" href="/">
              Skoða hvað er í dag
            </Link>
          </div>
        ) : (
          <ul className="plan-list">
            {planItems.map((item) => (
              <li key={item.id}>
                <PlanCard item={item} onRemove={() => togglePlan(item)} removeLabel="Taka af planinu" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="plan-section" id="vistad" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="section-title">
          Vistað <span>{loaded ? favoriteItems.length : ""}</span>
        </h2>
        {loaded && favoriteItems.length === 0 ? (
          <p className="hint">Ýttu á hjartað til að geyma eitthvað hér.</p>
        ) : (
          <ul className="plan-list">
            {favoriteItems.map((item) => (
              <li key={item.id}>
                <PlanCard item={item} onRemove={() => toggleFavorite(item)} removeLabel="Fjarlægja" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PlanCard({ item, onRemove, removeLabel }: { item: FeedItem; onRemove: () => void; removeLabel: string }) {
  return (
    <article className="plan-card">
      <span className="plan-thumb">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" />
        )}
      </span>
      <div className="plan-info">
        <p className="post-cat">{item.categoryLabel}</p>
        <h3>{item.title}</h3>
        <p>{[item.place, item.whenLabel, item.priceLabel].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="plan-actions">
        <a className="btn btn-small" href={item.url} target="_blank" rel="noopener noreferrer">
          Opna
          <Icon name="external" />
        </a>
        <button className="icon-toggle" type="button" onClick={onRemove} aria-label={`${removeLabel}: ${item.title}`}>
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

function sortByTime(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => (a.startsAt ?? "9").localeCompare(b.startsAt ?? "9"));
}
