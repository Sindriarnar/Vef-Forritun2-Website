"use client";

import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** One feed post, as in the AI concept: header, big photo with text, actions. */
export function PostCard({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  const saved = isFavorite(item.id);
  const planned = inPlan(item.id);

  return (
    <article className="feed-post">
      <header className="post-header">
        <button className="post-avatar" type="button" onClick={() => onOpen(item)} aria-label={`Skoða ${item.place}`}>
          {item.imageUrl ? (
            // External images from many hosts; plain <img> keeps it simple.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" loading="lazy" />
          ) : (
            <Icon name="spark" />
          )}
        </button>
        <div className="post-account">
          <strong>
            <button type="button" onClick={() => onOpen(item)}>
              {item.place}
            </button>
          </strong>
          <span>{[item.placeDetail, item.categoryLabel].filter(Boolean).join(" · ")}</span>
        </div>
        <button className="post-more" type="button" onClick={() => onOpen(item)} aria-label={`Nánar um ${item.title}`}>
          <Icon name="more" />
        </button>
      </header>

      <div className="post-media">
        <button className="image-open" type="button" onClick={() => onOpen(item)} aria-label={`Skoða ${item.title}`}>
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" loading="lazy" />
          )}
          <span className="post-gradient" aria-hidden="true" />
          <span className="post-overlay">
            <span className="post-kicker">
              {item.isLive && <span className="live-dot" />}
              {item.categoryLabel}
            </span>
            <span className="post-title" role="heading" aria-level={3}>
              {item.title}
            </span>
            {item.subtitle && <span className="post-subtitle">{item.subtitle}</span>}
            <span className="post-overlay-meta">
              <span>
                {item.whenLabel && (
                  <>
                    <Icon name="clock" />
                    {item.whenLabel}
                  </>
                )}
              </span>
              {item.priceLabel && (
                <span className="post-price">
                  {item.priceNote === "frá" && <small className="price-from">frá</small>}
                  <strong>{item.priceLabel}</strong>
                  {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
                </span>
              )}
            </span>
          </span>
        </button>
        {item.discountPercent ? (
          <span className="card-tag discount-tag">−{item.discountPercent}%</span>
        ) : (
          item.tag && <span className="card-tag">{item.tag}</span>
        )}
      </div>

      <div className="post-actions">
        <button
          className="post-save"
          type="button"
          aria-pressed={saved}
          onClick={() => toggleFavorite(item)}
          aria-label={`${saved ? "Fjarlægja úr" : "Vista í"} uppáhaldi: ${item.title}`}
        >
          <Icon name="heart" />
          <span>{saved ? "Vistað" : "Vista"}</span>
        </button>
        <button className="post-details" type="button" onClick={() => onOpen(item)}>
          <Icon name="info" />
          <span>Nánar</span>
        </button>
        <button className="post-plan" type="button" aria-pressed={planned} onClick={() => togglePlan(item)}>
          <Icon name={planned ? "check" : "calendar"} />
          {planned ? "Á planinu" : "Setja á planið"}
        </button>
      </div>
    </article>
  );
}
