"use client";

import { useRef } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "@/components/shared/Icon";
import { useSaved } from "@/components/shared/SavedProvider";
import type { Collection } from "./collection-rules";
import styles from "./Collections.module.css";

/** The curated rows: one horizontally scrolling shelf of poster cards each. */
export function Collections({ collections, onOpen }: { collections: Collection[]; onOpen: (item: FeedItem) => void }) {
  if (collections.length === 0) return null;
  return (
    <div className={styles.collections}>
      {collections.map((c) => (
        <Row key={c.id} collection={c} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Row({ collection, onOpen }: { collection: Collection; onOpen: (item: FeedItem) => void }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const headingId = `collection-${collection.id}`;

  return (
    <section className={styles.row} data-tone={collection.tone} aria-labelledby={headingId}>
      <header className={styles.head}>
        <div>
          <h2 id={headingId}>
            {collection.title}
            <span>{collection.items.length}</span>
          </h2>
          <p>{collection.blurb}</p>
        </div>
        <div className={styles.arrows}>
          <button type="button" onClick={() => scroll(-1)} aria-label={`Fyrri í ${collection.title}`}>
            <Icon name="chevron" className={styles.back} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Næstu í ${collection.title}`}>
            <Icon name="chevron" />
          </button>
        </div>
      </header>
      <ul className={styles.track} ref={track}>
        {collection.items.map((item) => (
          <li key={item.id}>
            <Poster item={item} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Poster({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  const { inPlan, togglePlan } = useSaved();
  const planned = inPlan(item.id);
  const when = item.dateParts
    ? `${item.dateParts.weekday} ${item.dateParts.day}. ${item.dateParts.month}${item.timeLabel ? ` · ${item.timeLabel}` : ""}`
    : item.whenLabel;
  const price = item.free ? "Frítt" : item.discountPercent ? `−${item.discountPercent}%` : item.priceLabel;

  return (
    <article className={styles.poster} data-cat={item.category}>
      <button type="button" className={styles.open} onClick={() => onOpen(item)} aria-label={`Nánar: ${item.title}`}>
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" />
        )}
        <span className={styles.shade} aria-hidden="true" />
        {price && <span className={styles.price}>{price}</span>}
        <span className={styles.text}>
          <small>{when}</small>
          <strong>{item.title}</strong>
          <span>{item.place}</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.add}
        aria-pressed={planned}
        onClick={() => togglePlan(item)}
        aria-label={`${planned ? "Taka af planinu" : "Bæta í planið"}: ${item.title}`}
        title={planned ? "Á planinu" : "Bæta í planið"}
      >
        <Icon name={planned ? "check" : "plus"} />
      </button>
    </article>
  );
}
