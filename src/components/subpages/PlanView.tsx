"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { travelBetween } from "@/lib/item-utils";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { Icon } from "@/components/shared/Icon";
import { useSaved } from "@/components/shared/SavedProvider";
import { Outings } from "./Outings";

interface PlanViewProps {
  items: FeedItem[]; // today's feed, for the ready-made outings
  today: string;
  tomorrow: string;
  now: number; // minutes after midnight
}

/** What you put on your plan, ready-made outings, and what you saved. */
export function PlanView({ items, today, tomorrow, now }: PlanViewProps) {
  const { plan, favorites, loaded, togglePlan, toggleFavorite } = useSaved();
  const [open, setOpen] = useState<FeedItem | null>(null);
  const planItems = sortByTime(Object.values(plan));
  const favoriteItems = Object.values(favorites);
  const empty = loaded && planItems.length === 0;
  const outings = (
    <div className="plan-section">
      <Outings items={items} today={today} tomorrow={tomorrow} now={now} onOpen={setOpen} />
    </div>
  );

  return (
    <>
      <div className="page-head plan-head">
        <h1>Planið</h1>
        {empty ? (
          // Nothing planned yet: one line, and the ready-made plans right below.
          <p>
            Ekkert á planinu enn. Veldu tilbúið plan eða ýttu á + við eitthvað á <Link href="/">forsíðunni</Link>.
          </p>
        ) : (
          <p>Geymist bara í þessum vafra.</p>
        )}
      </div>

      {empty && outings}

      {!empty && (
        <section className="plan-section" aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="section-title">
            Á planinu <span>{loaded ? planItems.length : ""}</span>
          </h2>
          <ul className="plan-list">
            {planItems.map((item, i) => {
              // How to get here from the previous stop, when both are on the map.
              const travel = i > 0 ? travelBetween(planItems[i - 1], item) : null;
              return (
                <Fragment key={item.id}>
                  {travel && (
                    <li className="plan-leg">
                      <Icon name={travel.mode === "ganga" ? "pin" : "map"} />
                      {travel.label}
                    </li>
                  )}
                  <li>
                    <PlanCard item={item} onRemove={() => togglePlan(item)} removeLabel="Taka af planinu" />
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </section>
      )}

      {!empty && outings}

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

      <DetailDialog item={open} onClose={() => setOpen(null)} />
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
