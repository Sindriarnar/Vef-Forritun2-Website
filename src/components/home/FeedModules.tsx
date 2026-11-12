"use client";

import { useState } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { AgePill } from "@/components/shared/AgeFilter";

/**
 * Compact sections that break up the feed, so not everything is a big
 * photo post: a poster shelf for today's movies and a list for places
 * with opening hours (pools, happy hours, activities).
 */

export function MovieShelf({
  id,
  title,
  movies,
  layout,
  onOpen,
}: {
  id: string;
  title: string; // "Í bíó í dag", "Í bíó á morgun"
  movies: FeedItem[];
  layout: "rail" | "grid";
  onOpen: (item: FeedItem) => void;
}) {
  if (movies.length === 0) return null;
  return (
    <section className="module" aria-labelledby={`${id}-heading`}>
      <div className="module-head">
        <h2 id={`${id}-heading`}>{title}</h2>
        <span>{movies.length} myndir</span>
      </div>
      <div className={layout === "rail" ? "poster-rail" : "poster-grid"}>
        {movies.map((movie) => {
          // The same time at two cinemas is shown once on the card (all of them are in the details).
          const times = [...new Set((movie.showtimes ?? []).map((s) => s.time))];
          return (
            <button key={movie.id} type="button" className="poster-card" onClick={() => onOpen(movie)}>
              <span className="poster">
                {movie.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.imageUrl} alt="" loading="lazy" />
                )}
                <AgePill item={movie} />
              </span>
              <strong>{movie.title}</strong>
              <span className="poster-times">
                {times.slice(0, 3).map((time) => (
                  <span key={time}>{time}</span>
                ))}
                {times.length > 3 && <span className="more">+{times.length - 3}</span>}
              </span>
              <small>{movie.place}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const COLLAPSED = 5;

export function PlaceList({
  id,
  title,
  places,
  onOpen,
}: {
  id: string;
  title: string;
  places: FeedItem[];
  onOpen: (item: FeedItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (places.length === 0) return null;
  const openNow = places.filter((p) => p.isLive).length;
  const shown = expanded ? places : places.slice(0, COLLAPSED);

  return (
    <section className="module" aria-labelledby={`${id}-heading`}>
      <div className="module-head">
        <h2 id={`${id}-heading`}>{title}</h2>
        <span>{openNow > 0 ? `${openNow} opið núna` : `${places.length} staðir`}</span>
      </div>
      <ul className="place-list">
        {shown.map((place) => (
          <li key={place.id}>
            <PlaceRow place={place} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {places.length > COLLAPSED && (
        <button type="button" className="module-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Sýna færri" : `Sýna alla (${places.length})`}
        </button>
      )}
    </section>
  );
}

export function PlaceRow({ place, onOpen }: { place: FeedItem; onOpen: (item: FeedItem) => void }) {
  // Events get a short "þri 10:00"; places show "Opið til 22:00" etc.
  const status =
    place.kind === "event" && place.dateParts ? `${place.dateParts.weekday} ${place.timeLabel}` : place.whenLabel;
  return (
    <button type="button" className="place-row" onClick={() => onOpen(place)}>
      <span className="place-thumb">
        {place.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" loading="lazy" />
        )}
      </span>
      <span className="place-text">
        <strong>
          {place.title}
          <AgePill item={place} />
        </strong>
        <small>{place.kind === "happy_hour" ? place.timeLabel : (place.placeDetail ?? place.subtitle)}</small>
      </span>
      <span className="status" data-live={place.isLive || undefined}>
        {status}
      </span>
    </button>
  );
}
