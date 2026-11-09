"use client";

import { useMemo, useState } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { DetailDialog } from "./DetailDialog";
import { Icon } from "./Icon";
import { PostCard } from "./PostCard";

const FILTERS = [
  { id: "all", label: "Allt" },
  { id: "today", label: "Í dag" },
  { id: "tomorrow", label: "Á morgun" },
  { id: "weekend", label: "Um helgina" },
  { id: "week", label: "Næstu 7 daga" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

/** "Viðburðir": upcoming events with day filters. */
export function EventsView({ events }: { events: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<FeedItem | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return events;
    const [from, to] = range(filter, new Date());
    return events.filter((e) => e.startsAt && e.startsAt >= from && e.startsAt < to);
  }, [events, filter]);

  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">
          <span className="live-dot" />
          EITTHVAÐ TIL AÐ HLAKKA TIL
        </p>
        <h1>
          Vertu þar sem <em>eitthvað gerist.</em>
        </h1>
        <p>Tónleikar, leikhús og viðburðir. Finndu næsta tilefni til að fara út.</p>
      </div>
      <div className="section-heading events-heading">
        <div className="category-filters" aria-label="Velja dag">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="results-count" role="status">
          {visible.length} {visible.length % 10 === 1 && visible.length % 100 !== 11 ? "viðburður" : "viðburðir"}
        </span>
      </div>

      {visible.length > 0 ? (
        <div className="offer-grid event-grid">
          {visible.map((item) => (
            <PostCard key={item.id} item={item} onOpen={setOpen} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="calendar" />
          </span>
          <h2>Engir viðburðir á þessum tíma.</h2>
          <p>Prófaðu annan dag eða skoðaðu alla viðburði.</p>
          <button className="button button-dark" type="button" onClick={() => setFilter("all")}>
            Sýna alla viðburði
          </button>
        </div>
      )}
      <DetailDialog item={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** [from, to) as ISO strings. Iceland is UTC+0, so UTC days are local days. */
function range(filter: Exclude<Filter, "all">, now: Date): [string, string] {
  const day = (offset: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
    return d.toISOString();
  };
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
