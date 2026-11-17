"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, fitsAgeGroup, inCategory, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { AgeFilter, useAgeGroup } from "@/components/shared/AgeFilter";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { Icon } from "@/components/shared/Icon";
import { buildCollections } from "./collection-rules";
import { Collections } from "./Collections";
import { EventCard } from "./EventCard";
import { fitsMood, fitsWhen, mixKinds, MOODS, WHENS, type Calendar, type Mood, type When } from "./moods";
import styles from "./Frontpage.module.css";

interface FrontpageProps {
  items: FeedItem[]; // today's feed plus the weekend's events
  calendar: Calendar;
  todayLabel: string; // "föstudagur 13. nóvember"
  updatedLabel: string; // "í dag kl. 13:47"
}

/** Cards shown at first, and how many more "Sýna fleiri" adds. */
const PAGE = 24;

/**
 * The front page: pick when (Í dag / Í kvöld / Um helgina) and,
 * optionally, a mood (Ókeypis, Stefnumót...). Then narrow it by category
 * or search, and get a grid of cards to save or add to the plan.
 */
export function Frontpage({ items, calendar, todayLabel, updatedLabel }: FrontpageProps) {
  const [when, setWhen] = useState<When>("idag");
  const [mood, setMood] = useState<Mood | null>(null);
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<FeedItem | null>(null);
  const { age, setAge } = useAgeGroup();

  // Any filter change starts the list from the top again.
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setLimit(PAGE);
    };

  const forAge = useMemo(() => (age === "all" ? items : items.filter((i) => fitsAgeGroup(i, age))), [items, age]);
  const inWhen = useMemo(() => forAge.filter((i) => fitsWhen(i, when, calendar)), [forAge, when, calendar]);
  const collections = useMemo(() => buildCollections(forAge, calendar), [forAge, calendar]);
  // The curated rows are for browsing; once you filter or search, only the grid is shown.
  const browsing = !mood && category === "all" && !query;

  // How many each mood would give right now (shown on the tiles).
  const moodCounts = useMemo(
    () =>
      Object.fromEntries(MOODS.map((m) => [m.id, inWhen.filter((i) => fitsMood(i, m.id)).length])) as Record<
        Mood,
        number
      >,
    [inWhen],
  );

  const results = useMemo(() => {
    const q = normalise(query);
    const matching = inWhen.filter(
      (i) =>
        (!mood || fitsMood(i, mood)) &&
        (category === "all" || inCategory(i, category)) &&
        (!q || normalise(`${i.title} ${i.place} ${i.subtitle ?? ""} ${i.categoryLabel}`).includes(q)),
    );
    if (when !== "helgin") return mixKinds(matching);
    // The weekend goes day by day, then what is on any day.
    return [
      ...calendar.weekend.flatMap((day) => mixKinds(matching.filter((i) => i.dayKey === day))),
      ...mixKinds(matching.filter((i) => !i.dayKey)),
    ];
  }, [inWhen, mood, category, query, when, calendar]);

  const shown = results.slice(0, limit);
  const groups =
    when === "helgin" ? groupByDay(shown, calendar) : [{ key: "all", heading: null, items: shown }];

  const openRandom = useCallback(() => {
    const pool = results.length ? results : inWhen;
    if (pool.length) setOpen(pool[Math.floor(Math.random() * pool.length)]);
  }, [results, inWhen]);

  // "Veldu fyrir mig" from the header (event) or from another page (#random).
  useEffect(() => {
    const onRandom = () => openRandom();
    window.addEventListener("hvad:random", onRandom);
    if (window.location.hash === "#random") {
      history.replaceState(null, "", "/");
      onRandom();
    }
    return () => window.removeEventListener("hvad:random", onRandom);
  }, [openRandom]);

  const whenLabel = WHENS.find((w) => w.id === when)!.label.toLowerCase();
  const moodLabel = MOODS.find((m) => m.id === mood)?.label;

  return (
    <div className={styles.frontpage}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <span className={styles.blobA} aria-hidden="true" />
        <span className={styles.blobB} aria-hidden="true" />
        <span className={styles.blobC} aria-hidden="true" />

        <p className={styles.today}>{todayLabel}</p>
        <h1 id="hero-title" className={styles.heroTitle}>
          Hvað langar þig{" "}
          <br />
          að <em>gera</em>?
        </h1>

        <div className={styles.when} role="radiogroup" aria-label="Hvenær?">
          {WHENS.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={when === w.id}
              onClick={() => reset(setWhen)(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className={styles.moods} role="group" aria-label="Stemning">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.mood}
              data-mood={m.id}
              aria-pressed={mood === m.id}
              onClick={() => reset(setMood)(mood === m.id ? null : m.id)}
            >
              <span className={styles.moodCount}>{moodCounts[m.id]}</span>
              <strong>{m.label}</strong>
              <small>{m.blurb}</small>
            </button>
          ))}
          <button type="button" className={`${styles.mood} ${styles.dice}`} onClick={openRandom}>
            <Icon name="dice" />
            <strong>Veldu fyrir mig</strong>
            <small>Komdu mér á óvart</small>
          </button>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.cats} role="group" aria-label="Flokkar">
          <button type="button" aria-pressed={category === "all"} onClick={() => reset(setCategory)("all")}>
            Allt
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => reset(setCategory)(category === c.id ? "all" : c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <Icon name="search" />
          <input
            type="search"
            placeholder="Leita…"
            aria-label="Leita að viðburði, stað eða tilboði"
            autoComplete="off"
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
          />
        </label>
      </div>

      <AgeFilter hidden={items.length - forAge.length} />

      {browsing && <Collections collections={collections} onOpen={setOpen} />}

      <div className={styles.resultsHead} aria-live="polite">
        <h2>
          {moodLabel ?? "Allt"} <span>{whenLabel}</span>
        </h2>
        <p>
          {results.length} {results.length % 10 === 1 && results.length % 100 !== 11 ? "hugmynd" : "hugmyndir"}
        </p>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <h3>Ekkert fannst</h3>
          <p>Prófaðu annan dag, aðra stemningu eða annan flokk.</p>
          <button
            type="button"
            onClick={() => {
              setMood(null);
              setCategory("all");
              setQuery("");
              setAge("all");
              setLimit(PAGE);
            }}
          >
            Sýna allt
          </button>
        </div>
      ) : (
        groups.map((group, g) => (
          <section
            key={`${when}-${mood}-${category}-${group.key}`}
            className={styles.group}
            aria-label={group.heading ?? undefined}
          >
            {group.heading && (
              <h3 className={styles.dayHeading}>
                {group.heading}
                <span>{group.items.length}</span>
              </h3>
            )}
            <div className={styles.grid}>
              {group.items.map((item, i) => (
                <EventCard
                  key={item.id}
                  item={item}
                  onOpen={setOpen}
                  featured={g === 0 && i === 0 && Boolean(item.imageUrl)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {results.length > limit && (
        <button type="button" className={styles.more} onClick={() => setLimit((n) => n + PAGE)}>
          Sýna fleiri ({results.length - limit} eftir)
        </button>
      )}

      <p className={styles.updated}>Síðast uppfært {updatedLabel}.</p>

      <DetailDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Split the weekend list into one section per day (and one for "any day"). */
function groupByDay(shown: FeedItem[], calendar: Calendar) {
  const days = calendar.weekend.map((day) => ({
    key: day,
    heading: calendar.headings[day] ?? day,
    items: shown.filter((i) => i.dayKey === day),
  }));
  return [...days, { key: "any", heading: "Hvenær sem er um helgina", items: shown.filter((i) => !i.dayKey) }].filter(
    (g) => g.items.length > 0,
  );
}

/** Lowercase without accents, so "sundholl" finds "Sundhöll". */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
