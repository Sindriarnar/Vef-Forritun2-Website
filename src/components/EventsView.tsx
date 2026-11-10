"use client";

import { useMemo, useState } from "react";
import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { AgeFilter, AgePill, useAgeGroup } from "./AgeFilter";
import { DetailDialog } from "./DetailDialog";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

const FILTERS = [
  { id: "all", label: "Allt" },
  { id: "today", label: "Í dag" },
  { id: "tomorrow", label: "Á morgun" },
  { id: "weekend", label: "Um helgina" },
  { id: "week", label: "Næstu 7 daga" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

/** Upcoming events, grouped by day, with quick day filters. */
export function EventsView({ events }: { events: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<FeedItem | null>(null);
  const { age, setAge } = useAgeGroup();

  const visible = useMemo(() => {
    const forAge = age === "all" ? events : events.filter((e) => fitsAgeGroup(e, age));
    if (filter === "all") return forAge;
    const [from, to] = range(filter, new Date());
    return forAge.filter((e) => e.startsAt && e.startsAt >= from && e.startsAt < to);
  }, [events, filter, age]);

  // Group by day, keeping the order (events are sorted by start time).
  const days = useMemo(() => {
    const groups: { key: string; heading: string; items: FeedItem[] }[] = [];
    for (const event of visible) {
      const key = event.dayKey ?? "?";
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(event);
      else groups.push({ key, heading: event.dayHeading ?? "", items: [event] });
    }
    return groups;
  }, [visible]);

  return (
    <>
      <div className="page-head">
        <h1>Viðburðir</h1>
        <p>Tónleikar, leiksýningar, uppistand og fleira næstu vikurnar.</p>
      </div>

      <AgeFilter />

      <div className="filter-bar">
        <div className="chips" role="group" aria-label="Velja tímabil">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="count" role="status">
          {visible.length} {visible.length % 10 === 1 && visible.length % 100 !== 11 ? "viðburður" : "viðburðir"}
        </span>
      </div>

      {days.length > 0 ? (
        days.map((day) => (
          <section key={day.key} className="day-group" aria-label={day.heading}>
            <h2 className="day-heading">{day.heading}</h2>
            <ul className="event-list">
              {day.items.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} onOpen={setOpen} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="empty">
          <h2>Ekkert á dagskrá þá</h2>
          <p>
            {age === "all"
              ? "Prófaðu annan dag eða skoðaðu alla viðburði."
              : "Prófaðu annan dag, annan aldurshóp eða skoðaðu alla viðburði."}
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setFilter("all");
              setAge("all");
            }}
          >
            Sýna alla viðburði
          </button>
        </div>
      )}
      <DetailDialog item={open} onClose={() => setOpen(null)} />
    </>
  );
}

function EventRow({ event, onOpen }: { event: FeedItem; onOpen: (item: FeedItem) => void }) {
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  const saved = isFavorite(event.id);
  const planned = inPlan(event.id);
  const extra = [event.priceLabel && `frá ${event.priceLabel}`, event.placeDetail, event.categoryLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="event-row">
      {event.dateParts && (
        <span className="date-block" aria-hidden="true">
          <small>{event.dateParts.weekday}</small>
          <strong>{event.dateParts.day}</strong>
          <small>{event.dateParts.month}</small>
        </span>
      )}
      <button className="event-thumb" type="button" onClick={() => onOpen(event)} tabIndex={-1} aria-hidden="true">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" loading="lazy" />
        ) : (
          <Icon name="calendar" />
        )}
      </button>
      <div className="event-info">
        <h3>
          <button type="button" onClick={() => onOpen(event)}>
            {event.title}
          </button>
          <AgePill item={event} />
        </h3>
        <p>
          <strong>kl. {event.timeLabel}</strong> · {event.place}
        </p>
        {extra && <p className="event-extra">{extra}</p>}
      </div>
      <div className="event-actions">
        <button
          type="button"
          className="icon-toggle"
          aria-pressed={saved}
          onClick={() => toggleFavorite(event)}
          aria-label={`${saved ? "Fjarlægja úr vistuðu" : "Vista"}: ${event.title}`}
        >
          <Icon name="heart" className="icon-heart" />
        </button>
        <button
          type="button"
          className="icon-toggle"
          aria-pressed={planned}
          onClick={() => togglePlan(event)}
          aria-label={`${planned ? "Taka af planinu" : "Setja á planið"}: ${event.title}`}
        >
          <Icon name={planned ? "check" : "plus"} />
        </button>
      </div>
    </article>
  );
}

/** [from, to) as ISO strings. Iceland is UTC+0, so UTC days are local days. */
function range(filter: Exclude<Filter, "all">, now: Date): [string, string] {
  const day = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString();
  const nowIso = now.toISOString();
  switch (filter) {
    case "today":
      return [nowIso, day(1)];
    case "tomorrow":
      return [day(1), day(2)];
    case "week":
      return [nowIso, day(7)];
    case "weekend": {
      // Friday to Sunday of this weekend (or the coming one).
      const weekday = now.getUTCDay(); // 0 = Sunday
      const toFriday = weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday;
      const from = day(toFriday);
      return [from > nowIso ? from : nowIso, day(toFriday + 3)];
    }
  }
}
