"use client";

import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** A big feed post (deals and events): photo, caption below it, actions. */
export function PostCard({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  return (
    <article className="post">
      <header className="post-head">
        <Avatar name={item.place} />
        <div className="post-who">
          <strong>{item.place}</strong>
          {item.placeDetail && <span>{item.placeDetail}</span>}
        </div>
      </header>

      <button className="post-image" type="button" onClick={() => onOpen(item)} aria-label={`Nánar: ${item.title}`}>
        {item.imageUrl ? (
          // External images from many hosts; plain <img> keeps it simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="post-image-empty">{item.categoryLabel}</span>
        )}
        {item.discountPercent ? <span className="badge badge-discount">−{item.discountPercent}%</span> : null}
        {item.dateParts && (
          <span className="badge badge-date">
            {item.dateParts.weekday} {item.dateParts.day}. {item.dateParts.month}
          </span>
        )}
      </button>

      <div className="post-body">
        <p className="post-cat">{item.categoryLabel}</p>
        <h3 className="post-title">
          <button type="button" onClick={() => onOpen(item)}>
            {item.title}
          </button>
        </h3>
        {item.subtitle && <p className="post-sub">{item.subtitle}</p>}
        {(item.whenLabel || item.priceLabel) && (
          <div className="post-meta">
            {item.whenLabel && (
              <span>
                <Icon name="clock" />
                {item.whenLabel}
              </span>
            )}
            {item.priceLabel && <Price item={item} />}
          </div>
        )}
      </div>

      <PostActions item={item} />
    </article>
  );
}

export function Price({ item }: { item: FeedItem }) {
  return (
    <span className="price">
      {item.priceNote === "frá" && <small>frá </small>}
      <strong>{item.priceLabel}</strong>
      {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
    </span>
  );
}

export function PostActions({ item }: { item: FeedItem }) {
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  const saved = isFavorite(item.id);
  const planned = inPlan(item.id);
  return (
    <footer className="post-actions">
      <button
        className="action"
        type="button"
        aria-pressed={saved}
        onClick={() => toggleFavorite(item)}
        aria-label={`${saved ? "Fjarlægja úr vistuðu" : "Vista"}: ${item.title}`}
      >
        <Icon name="heart" className="icon-heart" />
        {saved ? "Vistað" : "Vista"}
      </button>
      <button className="action" type="button" aria-pressed={planned} onClick={() => togglePlan(item)}>
        <Icon name={planned ? "check" : "plus"} />
        {planned ? "Á planinu" : "Á planið"}
      </button>
      {item.url && (
        <a className="action action-out" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.sourceName}
          <Icon name="external" />
        </a>
      )}
    </footer>
  );
}

const AVATAR_COLORS = ["#3b4a6b", "#5b3f5e", "#3f5e4f", "#6b4f3b", "#4a3b6b", "#3b5f66", "#66503b", "#5e3f45"];

/** Initials on a colour picked from the name, like a contact avatar. */
export function Avatar({ name }: { name: string }) {
  const initials = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className="avatar" style={{ background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}
