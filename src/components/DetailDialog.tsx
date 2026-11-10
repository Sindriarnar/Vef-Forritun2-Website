"use client";

import { useEffect, useRef } from "react";
import { ageText, type FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { Price } from "./PostCard";
import { useSaved } from "./SavedProvider";

/** Details about one item, with a link to the source site. */
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
  const poster = item?.kind === "movie";
  const age = item ? ageText(item) : null;

  return (
    <dialog
      ref={ref}
      className="detail"
      aria-label={item ? item.title : "Nánar"}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {item && (
        <div className={`detail-layout${poster ? " is-poster" : ""}${item.imageUrl ? "" : " no-image"}`}>
          <button className="detail-close" type="button" onClick={onClose} aria-label="Loka">
            <Icon name="close" />
          </button>
          {item.imageUrl && (
            <div className="detail-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" />
              {item.discountPercent ? <span className="badge badge-discount">−{item.discountPercent}%</span> : null}
            </div>
          )}

          <div className="detail-body">
            <p className="post-cat">{item.categoryLabel}</p>
            <h2>{item.title}</h2>
            {item.subtitle && <p className="detail-sub">{item.subtitle}</p>}

            <dl className="detail-facts">
              {item.kind === "idea" ? (
                <div>
                  <dt>Hentar</dt>
                  <dd>{item.tags?.join(" · ")}</dd>
                </div>
              ) : (
                <div>
                  <dt>Staður</dt>
                  <dd>
                    {item.place}
                    {item.placeDetail && <span> · {item.placeDetail}</span>}
                  </dd>
                </div>
              )}
              {item.whenLabel && (
                <div>
                  <dt>Hvenær</dt>
                  <dd>
                    {item.isLive && <span className="dot" aria-hidden="true" />}
                    {item.whenLabel}
                  </dd>
                </div>
              )}
              {age && (
                <div>
                  <dt>Aldur</dt>
                  <dd>{age}</dd>
                </div>
              )}
              {item.priceLabel && (
                <div>
                  <dt>Verð</dt>
                  <dd>
                    <Price item={item} />
                  </dd>
                </div>
              )}
            </dl>

            {item.description && <p className="detail-text">{item.description}</p>}

            {item.showtimes && item.showtimes.length > 0 && (
              <div className="showtimes">
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

            <div className="detail-actions">
              {item.url && (
                <a className="btn btn-primary" href={item.url} target="_blank" rel="noopener noreferrer">
                  Opna á {item.sourceName}
                  <Icon name="external" />
                </a>
              )}
              <button
                className={item.url ? "btn" : "btn btn-primary"}
                type="button"
                aria-pressed={planned}
                onClick={() => togglePlan(item)}
              >
                <Icon name={planned ? "check" : "plus"} />
                {planned ? "Á planinu" : "Setja á planið"}
              </button>
              <button className="btn btn-icon" type="button" aria-pressed={saved} onClick={() => toggleFavorite(item)} aria-label={saved ? "Fjarlægja úr vistuðu" : "Vista"}>
                <Icon name="heart" className="icon-heart" />
              </button>
            </div>
            <p className="detail-note">
              {item.kind === "idea"
                ? "Hugmynd úr hugmyndabankanum okkar."
                : `Frá ${item.sourceName}. Verð og tímar geta breyst.`}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
