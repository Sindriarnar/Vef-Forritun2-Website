"use client";

import { useMemo, useState } from "react";
import { fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { formatKr } from "@/lib/item-utils";
import { useAgeGroup } from "@/components/shared/AgeFilter";
import { Icon } from "@/components/shared/Icon";
import { useSaved } from "@/components/shared/SavedProvider";
import {
  BUDGETS,
  buildOutings,
  DAYS,
  TIMES,
  type Budget,
  type Day,
  type Outing,
  type TimeOfDay,
} from "./outing-builder";
import styles from "./Outings.module.css";

interface OutingsProps {
  items: FeedItem[]; // today's feed plus tomorrow's events
  today: string; // "2026-11-13"
  tomorrow: string;
  now: number; // minutes after midnight (server time, so the server and browser agree)
  onOpen: (item: FeedItem) => void;
}

/** After this there's too little left of today: start on tomorrow's plans. */
const LATE = 20 * 60;

/** "Tilbúin plön": ready-made outings with day, time and budget filters. */
export function Outings({ items, today, tomorrow, now, onOpen }: OutingsProps) {
  const [day, setDay] = useState<Day>(now >= LATE ? "amorgun" : "idag");
  const [time, setTime] = useState<TimeOfDay>("allt");
  const [budget, setBudget] = useState<Budget>("allt");
  const [variant, setVariant] = useState<Record<string, number>>({});
  const { age } = useAgeGroup();

  const outings = useMemo(() => {
    const forAge = age === "all" ? items : items.filter((i) => fitsAgeGroup(i, age));
    const date = day === "idag" ? today : tomorrow;
    return buildOutings(forAge, { day, date, now, time, budget, variant });
  }, [items, age, day, today, tomorrow, now, time, budget, variant]);

  return (
    <section className={styles.outings} aria-labelledby="outings-heading">
      <div className={styles.head}>
        <h2 id="outings-heading">Tilbúin plön {day === "idag" ? "í dag" : "á morgun"}</h2>
        <p>
          Opið og á dagskrá, í réttri röð með ferðatíma.
          {day === "amorgun" && " Opnunartímar á morgun gætu verið aðrir."}
        </p>
      </div>

      {/* One rounded panel with a labelled row per filter. */}
      <div className={styles.filters}>
        <FilterGroup label="Dagur" options={DAYS} value={day} onChange={setDay} />
        <FilterGroup label="Tími" options={TIMES} value={time} onChange={setTime} />
        <FilterGroup label="Verð" options={BUDGETS} value={budget} onChange={setBudget} />
      </div>

      {outings.length === 0 ? (
        <p className={styles.none}>
          {day === "idag" && now >= LATE ? (
            <>
              Það er orðið of seint fyrir heilt plan í dag.{" "}
              <button type="button" className={styles.link} onClick={() => setDay("amorgun")}>
                Sjá plön fyrir morgundaginn
              </button>
            </>
          ) : (
            "Ekkert plan passar við þetta. Prófaðu annan tíma dags eða hærra verð."
          )}
        </p>
      ) : (
        <div className={styles.list}>
          {outings.map((outing) => (
            <OutingCard
              key={outing.id}
              outing={outing}
              onOpen={onOpen}
              onShuffle={() => setVariant((v) => ({ ...v, [outing.id]: (v[outing.id] ?? 0) + 1 }))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.options} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
            {value === o.id && <Icon name="check" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OutingCard({ outing, onOpen, onShuffle }: { outing: Outing; onOpen: (item: FeedItem) => void; onShuffle: () => void }) {
  const { inPlan, togglePlan } = useSaved();
  const allPlanned = outing.stops.every((s) => inPlan(s.item.id));
  const first = outing.stops[0];
  const last = outing.stops[outing.stops.length - 1];
  const price =
    outing.total === 0 && !outing.unknownPrice
      ? "Ókeypis"
      : outing.total === 0
        ? "Verð óþekkt"
        : `${outing.unknownPrice ? "frá " : "~"}${formatKr(outing.total)} á mann`;

  const addAll = () => {
    for (const { item } of outing.stops) {
      // Add what's missing; when everything is already there, the button takes it all off.
      if (allPlanned || !inPlan(item.id)) togglePlan(item);
    }
  };

  return (
    <article className={styles.card} data-tone={outing.tone}>
      <header className={styles.cardHead}>
        <p className={styles.kicker}>
          {outing.stops.length} stopp · {first.start}–{last.end}
        </p>
        <h3>{outing.title}</h3>
        <p>{outing.blurb}</p>
        <span className={styles.price}>{price}</span>
      </header>

      <ol className={styles.stops}>
        {outing.stops.map((stop, i) => (
          <li key={stop.item.id}>
            {/* The dashed line between stops; with the travel time when both places are on the map. */}
            {i > 0 && (
              <span className={styles.leg} data-empty={!stop.travel || undefined}>
                {stop.travel && (
                  <>
                    <Icon name={stop.travel.mode === "ganga" ? "pin" : "map"} />
                    {stop.travel.label}
                  </>
                )}
              </span>
            )}
            <button type="button" className={styles.stop} onClick={() => onOpen(stop.item)}>
              <span className={styles.num}>{i + 1}</span>
              <span className={styles.thumb}>
                {stop.item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stop.item.imageUrl} alt="" loading="lazy" />
                )}
              </span>
              <span className={styles.what}>
                <small>
                  {stop.start}–{stop.end} · {stop.label}
                </small>
                <strong>{stop.item.title}</strong>
                <span>{stop.item.place}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <footer className={styles.cardFoot}>
        <button type="button" className={styles.primary} aria-pressed={allPlanned} onClick={addAll}>
          <Icon name={allPlanned ? "check" : "plus"} />
          {allPlanned ? "Allt á planinu" : "Setja allt á planið"}
        </button>
        <button type="button" className={styles.ghost} onClick={onShuffle}>
          <Icon name="dice" />
          Annað plan
        </button>
      </footer>
    </article>
  );
}
