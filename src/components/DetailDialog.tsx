"use client";

import { useEffect, useRef } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** "Nánar" — details about one item, with links to the source site. */
export function DetailDialog({ item, onClose }: { item: FeedItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  const saved = item ? isFavorite(item.id) : false;
  const planned = item ? inPlan(item.id) : false;

  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-label={item ? `Nánar: ${item.title}` : "Nánar"}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {item && (
        <div className="detail-layout">
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Loka">
            <Icon name="close" />
          </button>
          <div className="detail-visual">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" />
            )}
            {item.discountPercent ? <span className="card-tag discount-tag">−{item.discountPercent}%</span> : null}
          </div>
          <div className="detail-main">
            <p className="detail-category">
              {item.isLive && <span className="live-dot" />}
              {item.categoryLabel}
            </p>
            <h2>{item.title}</h2>
            {item.subtitle && <p>{item.subtitle}</p>}
            {item.description && <p className="detail-description">{item.description}</p>}

            <div className="detail-facts">
              <p>
                <Icon name="pin" />
                <span>
                  {item.place}
                  {item.placeDetail && <small> · {item.placeDetail}</small>}
                </span>
              </p>
              {item.whenLabel && (
                <p>
                  <Icon name="clock" />
                  <span>{item.whenLabel}</span>
                </p>
              )}
            </div>

            {item.showtimes && item.showtimes.length > 0 && (
              <div className="detail-showtimes">
                <h3>Sýningar í dag</h3>
                <ul>
                  {item.showtimes.map((s) => (
                    <li key={`${s.time}-${s.venue}-${s.note}`}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        <strong>{s.time}</strong>
                        <span>{s.venue}</span>
                        {s.note && <small>{s.note}</small>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.priceLabel && (
              <p className="detail-price">
                {item.priceNote === "frá" && <small>frá</small>}
                {item.priceLabel}
                {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
              </p>
            )}

            <div className="detail-actions">
              <a className="button button-dark" href={item.url} target="_blank" rel="noopener noreferrer">
                Skoða á {item.sourceName}
                <Icon name="external" />
              </a>
              <button className="button button-outline" type="button" onClick={() => togglePlan(item)}>
                <Icon name={planned ? "check" : "calendar"} />
                {planned ? "Á planinu" : "Setja á planið"}
              </button>
              <button type="button" onClick={() => toggleFavorite(item)} aria-pressed={saved}>
                <Icon name="heart" />
                {saved ? "Vistað í uppáhaldi" : "Vista í uppáhaldi"}
              </button>
            </div>
            <p className="detail-note">Upplýsingar sóttar af {item.sourceName}. Verð og tímar geta breyst.</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
