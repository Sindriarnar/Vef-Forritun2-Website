"use client";

import { ageBadge, type FeedItem } from "@/lib/feed-types";
import { Icon } from "@/components/shared/Icon";
import { useSaved } from "@/components/shared/SavedProvider";
import styles from "./EventCard.module.css";

interface EventCardProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  /** The big card at the top of the results: wider, with the description. */
  featured?: boolean;
}

/**
 * A card in the front page grid: picture (or a coloured poster when there
 * is none), date block, category pill, title, place, time, price, and the
 * two actions, Vista and Bæta í planið.
 */
export function EventCard({ item, onOpen, featured = false }: EventCardProps) {
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  const saved = isFavorite(item.id);
  const planned = inPlan(item.id);
  const age = ageBadge(item);
  const when = item.kind === "event" && item.timeLabel ? `kl. ${item.timeLabel}` : item.whenLabel;

  return (
    <article className={`${styles.card} ${featured ? styles.featured : ""}`} data-cat={item.category}>
      <button className={styles.media} type="button" onClick={() => onOpen(item)} aria-label={`Nánar: ${item.title}`}>
        {item.imageUrl ? (
          // External images from many hosts; plain <img> keeps it simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.poster} aria-hidden="true">
            <span>{item.title}</span>
          </span>
        )}

        {item.dateParts ? (
          <span className={styles.date}>
            <small>{item.dateParts.weekday}</small>
            <strong>{item.dateParts.day}</strong>
            <small>{item.dateParts.month}</small>
          </span>
        ) : item.isLive ? (
          <span className={styles.live}>Opið núna</span>
        ) : null}

        <span className={styles.badges}>
          {item.discountPercent ? <span className={styles.discount}>−{item.discountPercent}%</span> : null}
          {item.free && <span className={styles.free}>Frítt</span>}
          {age && (
            <span className={styles.age} data-strong={age === "20+" || undefined}>
              {age}
            </span>
          )}
        </span>
      </button>

      <div className={styles.body}>
        <span className={styles.pill}>{item.categoryLabel}</span>
        <h3 className={styles.title}>
          <button type="button" onClick={() => onOpen(item)}>
            {item.title}
          </button>
        </h3>
        {featured && (item.subtitle || item.description) && (
          <p className={styles.blurb}>{item.subtitle ?? item.description}</p>
        )}
        <ul className={styles.meta}>
          {item.place && (
            <li>
              <Icon name="pin" />
              {item.place}
            </li>
          )}
          {when && (
            <li>
              <Icon name="clock" />
              {when}
            </li>
          )}
        </ul>

        <footer className={styles.foot}>
          <span className={styles.price}>
            {item.free ? (
              <strong>Frítt</strong>
            ) : item.priceLabel ? (
              <>
                {item.priceNote === "frá" && <small>frá </small>}
                <strong>{item.priceLabel}</strong>
                {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
              </>
            ) : null}
          </span>
          <button
            className={styles.save}
            type="button"
            aria-pressed={saved}
            onClick={() => toggleFavorite(item)}
            aria-label={`${saved ? "Fjarlægja úr vistuðu" : "Vista"}: ${item.title}`}
            title={saved ? "Vistað" : "Vista"}
          >
            <Icon name="heart" />
          </button>
          <button
            className={styles.plan}
            type="button"
            aria-pressed={planned}
            onClick={() => togglePlan(item)}
            aria-label={`${planned ? "Taka af planinu" : "Bæta í planið"}: ${item.title}`}
          >
            <Icon name={planned ? "check" : "plus"} />
            {planned ? "Á planinu" : "Bæta í planið"}
          </button>
        </footer>
      </div>
    </article>
  );
}
