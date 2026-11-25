"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { formatDay, formatTime } from "@/lib/format";
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

  
  return (
    <>
      <div className="page-head plan-head">
        <h1>Planið</h1>
        {empty ? (
          // Nothing planned yet: one line instead of an empty list.
          <p>
            Ekkert á planinu enn. Veldu tilbúið plan eða ýttu á + við eitthvað á <Link href="/">forsíðunni</Link>.
          </p>
        ) : (
          <p>Geymist í þessum vafra, og á aðganginum þínum ef þú ert skráð/ur inn.</p>
        )}
      </div>

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

      <div className="plan-section">
        <Outings items={items} today={today} tomorrow={tomorrow} now={now} onOpen={setOpen} />
      </div>

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
        <p>{[item.place, savedWhen(item), item.priceLabel].filter(Boolean).join(" · ")}</p>
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

/**
 * The date text on a saved card, worked out now from the saved start time.
 * The item's own whenLabel was written on the day it was saved ("í dag",
 * "Næsta sýning kl. 20:00", "Opið til 22:00") and goes stale the next day,
 * so it is only used for items without a start time (deals, ideas).
 */
function savedWhen(item: FeedItem): string | null {
  if (!item.startsAt) return item.whenLabel;
  const day = formatDay(item.startsAt); // "í dag" / "á morgun" / "mið. 11. nóv."
  const time = formatTime(item.startsAt);
  switch (item.kind) {
    case "movie":
      return `${(item.showtimes?.length ?? 1) > 1 ? "Fyrsta sýning" : "Sýning"} ${day} kl. ${time}`;
    case "event":
      return `${day.charAt(0).toUpperCase()}${day.slice(1)} kl. ${time}`;
    case "pool":
    case "happy_hour":
    case "activity":
    case "restaurant":
      return item.timeLabel === "Allan daginn"
        ? `Opið allan daginn ${day}`
        : `${item.kind === "happy_hour" ? "Happy hour" : "Opið"} ${day} kl. ${item.timeLabel ?? time}`;
    default:
      return item.whenLabel;
  }
}

function sortByTime(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => (a.startsAt ?? "9").localeCompare(b.startsAt ?? "9"));
}
