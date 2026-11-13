"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ageText, type FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";
import styles from "./DetailDialog.module.css";

/**
 * Details about one item, laid out in clear sections: who's behind it,
 * when, where, tickets/price, and what it is. The item's own picture,
 * blurred, colours the background, so every event looks a bit different.
 */
export function DetailDialog({ item, onClose }: { item: FeedItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={item ? item.title : "Nánar"}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {item && <Details key={item.id} item={item} onClose={onClose} />}
    </dialog>
  );
}

function Details({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  const saved = isFavorite(item.id);
  const planned = inPlan(item.id);
  const age = ageText(item);
  const isIdea = item.kind === "idea";
  // JSON.stringify quotes the address safely for CSS url("...").
  const cover = item.imageUrl ? ({ "--cover": `url(${JSON.stringify(item.imageUrl)})` } as CSSProperties) : undefined;

  const day =
    item.kind === "event"
      ? (item.dayHeading ?? null)
      : item.kind === "movie"
        ? capitalise(item.dayLabel ?? "í dag")
        : item.whenLabel && !isIdea
          ? capitalise(item.dayLabel ?? "í dag")
          : null;
  const time =
    item.kind === "event"
      ? [item.timeLabel && `kl. ${item.timeLabel}`, item.placeDetail].filter(Boolean).join(" · ")
      : item.kind === "movie"
        ? item.whenLabel
        : [item.whenLabel, item.timeLabel && item.timeLabel !== "Allan daginn" ? `Opið ${item.timeLabel}` : null]
            .filter(Boolean)
            .join(" · ");
  const mapUrl =
    item.lat != null && item.lng != null
      ? `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=17/${item.lat}/${item.lng}`
      : null;
  const action = item.kind === "event" ? "Kaupa miða" : item.kind === "deal" ? "Skoða tilboðið" : item.kind === "movie" ? "Miðar" : "Nánar";
  const tags = (item.tags ?? []).filter((t) => t !== item.categoryLabel).slice(0, 6);

  return (
    <div className={styles.frame} data-cat={item.category} style={cover}>
      <div className={styles.backdrop} aria-hidden="true" />
      <button className={styles.close} type="button" onClick={onClose} aria-label="Loka">
        <Icon name="close" />
      </button>

      <div className={styles.scroll}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <div className={`${styles.cover} ${item.kind === "movie" ? styles.poster : ""}`}>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" />
              ) : (
                <span className={styles.coverText}>{item.title}</span>
              )}
              {item.discountPercent ? <span className={styles.discount}>−{item.discountPercent}%</span> : null}
            </div>

            <div className={styles.host}>
              <span className={styles.hostMark} aria-hidden="true">
                {initials(isIdea ? "Hugmyndabankinn" : item.place)}
              </span>
              <div>
                <small>{isIdea ? "Hugmynd frá" : item.kind === "event" ? "Haldið af" : "Hjá"}</small>
                <strong>{isIdea ? "Hugmyndabankanum" : item.place}</strong>
                <span>{isIdea ? "Hugmyndir sem kosta lítið eða ekkert" : `Upplýsingar frá ${item.sourceName}`}</span>
              </div>
            </div>

            {(tags.length > 0 || age) && (
              <ul className={styles.tags} aria-label="Merki">
                {age && <li data-age>{age}</li>}
                {tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </aside>

          <div className={styles.main}>
            <span className={styles.pill}>{item.categoryLabel}</span>
            <h2 className={styles.title}>{item.title}</h2>
            {item.subtitle && <p className={styles.sub}>{item.subtitle}</p>}

            <ul className={styles.facts}>
              {(day || time) && (
                <li>
                  {item.dateParts ? (
                    <span className={styles.calendar} aria-hidden="true">
                      <small>{item.dateParts.month}</small>
                      <strong>{item.dateParts.day}</strong>
                    </span>
                  ) : (
                    <span className={styles.iconBox} aria-hidden="true">
                      <Icon name="clock" />
                    </span>
                  )}
                  <div>
                    <strong>
                      {item.isLive && <span className={styles.live} aria-hidden="true" />}
                      {day ?? time}
                    </strong>
                    {day && time && <span>{time}</span>}
                  </div>
                </li>
              )}
              {!isIdea && (
                <li>
                  <span className={styles.iconBox} aria-hidden="true">
                    <Icon name="pin" />
                  </span>
                  <div>
                    <strong>{item.place}</strong>
                    {item.kind !== "event" && item.placeDetail && <span>{item.placeDetail}</span>}
                    {mapUrl && (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                        Sjá á korti <Icon name="external" />
                      </a>
                    )}
                  </div>
                </li>
              )}
            </ul>

            <section className={styles.ticket} aria-label="Verð og miðar">
              <div className={styles.ticketTop}>
                <div>
                  <small>{isIdea ? "Kostnaður" : item.kind === "deal" ? "Tilboðsverð" : "Verð"}</small>
                  <p className={styles.price}>
                    {item.free ? (
                      "Frítt"
                    ) : item.priceLabel ? (
                      <>
                        {item.priceNote === "frá" && <small>frá </small>}
                        {item.priceLabel}
                        {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
                      </>
                    ) : (
                      <span className={styles.unknown}>{isIdea ? "Lítill eða enginn" : `Sjá hjá ${item.sourceName}`}</span>
                    )}
                  </p>
                </div>
                <button
                  className={styles.heart}
                  type="button"
                  aria-pressed={saved}
                  onClick={() => toggleFavorite(item)}
                  aria-label={saved ? "Fjarlægja úr vistuðu" : "Vista"}
                  title={saved ? "Vistað" : "Vista"}
                >
                  <Icon name="heart" />
                </button>
              </div>
              <div className={styles.actions}>
                {item.url && (
                  <a className={styles.primary} href={item.url} target="_blank" rel="noopener noreferrer">
                    {action} á {item.sourceName}
                    <Icon name="external" />
                  </a>
                )}
                <button className={styles.plan} type="button" aria-pressed={planned} onClick={() => togglePlan(item)}>
                  <Icon name={planned ? "check" : "plus"} />
                  {planned ? "Á planinu" : "Bæta í planið"}
                </button>
              </div>
              {!isIdea && <p className={styles.note}>Verð og tímar geta breyst. Athugaðu hjá {item.sourceName} áður en þú ferð.</p>}
            </section>

            {item.showtimes && item.showtimes.length > 0 && (
              <section className={styles.section}>
                <h3>Sýningar {item.dayLabel ?? "í dag"}</h3>
                <ul className={styles.showtimes}>
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
              </section>
            )}

            {item.description && (
              <section className={styles.section}>
                <h3>{isIdea ? "Hugmyndin" : item.kind === "event" ? "Um viðburðinn" : "Um staðinn"}</h3>
                <p className={styles.text}>{item.description}</p>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Phones: price and the two actions stay visible while the details scroll. */}
      <div className={styles.bar}>
        <div className={styles.barPrice}>
          <small>
            {item.kind === "deal" ? "Tilboð" : "Verð"}
            {!item.free && item.priceLabel && item.priceNote === "frá" ? " frá" : ""}
          </small>
          <strong>{item.free ? "Frítt" : (item.priceLabel ?? "–")}</strong>
        </div>
        <button
          className={styles.barPlan}
          type="button"
          aria-pressed={planned}
          onClick={() => togglePlan(item)}
          aria-label={planned ? "Taka af planinu" : "Bæta í planið"}
        >
          <Icon name={planned ? "check" : "plus"} />
          <span>{planned ? "Á planinu" : "Planið"}</span>
        </button>
        {item.url && (
          <a className={styles.barPrimary} href={item.url} target="_blank" rel="noopener noreferrer">
            {item.kind === "event" ? "Kaupa miða" : item.kind === "movie" ? "Miðar" : "Opna"}
            <Icon name="external" />
          </a>
        )}
      </div>
    </div>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Bíó Paradís" -> "BP" */
function initials(name: string): string {
  return (
    name
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}
