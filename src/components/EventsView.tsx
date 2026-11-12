"use client";

import { useMemo, useState } from "react";
import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { AgeFilter, AgePill, useAgeGroup } from "./AgeFilter";
import { DetailDialog } from "./DetailDialog";
import { FilterRow } from "./FilterRow";
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

/** The kind of event: everything, or only music ("Tónlist"). */
export type EventType = "all" | "tonlist";

/** Days shown at first, and added by "Sýna fleiri daga" (the whole list is hundreds of rows). */
const DAYS_PER_PAGE = 14;

/**
 * Upcoming events grouped by day, with quick day filters and a date
 * picker. `events` has one row per event per day it is on, so every day
 * lists everything that is on that day. `initialType` comes from the
 * address: /events?tegund=tonlist opens with only music.
 */
export function EventsView({ events, initialType = "all" }: { events: FeedItem[]; initialType?: EventType }) {
  const [type, setType] = useState<EventType>(initialType);
  const [filter, setFilter] = useState<Filter>("all");
  const [date, setDate] = useState(""); // "2026-11-21" when a day is picked
  const [shownDays, setShownDays] = useState(DAYS_PER_PAGE);
  const [open, setOpen] = useState<FeedItem | null>(null);
  const { age, setAge } = useAgeGroup();

  const forAge = useMemo(() => (age === "all" ? events : events.filter((e) => fitsAgeGroup(e, age))), [events, age]);

  const visible = useMemo(() => {
    const ofType = type === "tonlist" ? forAge.filter((e) => e.music) : forAge;
    if (date) return ofType.filter((e) => e.dayKey === date);
    if (filter === "all") return ofType;
    const [from, to] = range(filter, new Date());
    return ofType.filter((e) => e.startsAt && e.startsAt >= from && e.startsAt < to);
  }, [forAge, type, filter, date]);

  // An event that is on for several days is still one event.
  const eventCount = useMemo(() => new Set(visible.map((e) => e.url)).size, [visible]);
  const lastDay = events[events.length - 1]?.dayKey ?? undefined;

  const choose = (next: Filter) => {
    setFilter(next);
    setDate("");
    setShownDays(DAYS_PER_PAGE);
  };

  const chooseType = (next: EventType) => {
    setType(next);
    setShownDays(DAYS_PER_PAGE);
  };

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

      <AgeFilter hidden={events.length - forAge.length} />

      <div className="filter-group">
        <FilterRow label="Tegund">
          <button type="button" className="chip" aria-pressed={type === "all"} onClick={() => chooseType("all")}>
            Allt
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={type === "tonlist"}
            onClick={() => chooseType(type === "tonlist" ? "all" : "tonlist")}
          >
            Tónlist
          </button>
        </FilterRow>
      </div>

      <div className="filter-bar">
        <div className="chips" role="group" aria-label="Velja tímabil">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              aria-pressed={!date && filter === f.id}
              onClick={() => choose(f.id)}
            >
              {f.label}
            </button>
          ))}
          <label className="chip date-pick" data-active={date ? true : undefined}>
            Velja dag
            <input
              type="date"
              value={date}
              min={events[0]?.dayKey ?? undefined}
              max={lastDay}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <span className="count" role="status">
          {eventCount} {eventCount % 10 === 1 && eventCount % 100 !== 11 ? "viðburður" : "viðburðir"}
        </span>
      </div>

      {days.length > 0 ? (
        <>
          {days.slice(0, shownDays).map((day) => (
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
          ))}
          {days.length > shownDays && (
            <button type="button" className="btn more-days" onClick={() => setShownDays(shownDays + DAYS_PER_PAGE)}>
              Sýna fleiri daga ({days.length - shownDays} eftir)
            </button>
          )}
        </>
      ) : (
        <div className="empty">
          <h2>Ekkert á dagskrá þá</h2>
          <p>
            {age === "all"
              ? type === "all"
                ? "Prófaðu annan dag eða skoðaðu alla viðburði."
                : "Engin tónlist á dagskrá þá. Prófaðu annan dag eða skoðaðu alla viðburði."
              : "Prófaðu annan dag, annan aldurshóp eða skoðaðu alla viðburði."}
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              choose("all");
              chooseType("all");
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
