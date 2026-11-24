"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, fitsAgeGroup, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { AgeFilter, useAgeGroup } from "@/components/shared/AgeFilter";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { Icon } from "@/components/shared/Icon";
import { buildCollections } from "./collection-rules";
import { Collections } from "./Collections";
import { EventCard } from "./EventCard";
import { Randomizer } from "./Randomizer";
import {
  activeCount,
  DAY_PARTS,
  matches,
  NO_FILTERS,
  PRICES,
  searchText,
  TOGGLES,
  type DayPart,
  type Filters,
} from "./filters";
import { fitsWhen, mixKinds, MOODS, WHENS, type Calendar, type Mood, type When } from "./moods";
import styles from "./Frontpage.module.css";

interface FrontpageProps {
  items: FeedItem[]; // today's feed plus the coming week's events, movies and places
  calendar: Calendar;
  todayLabel: string; // "föstudagur 13. nóvember"
  updatedLabel: string; // "í dag kl. 13:47"
}

/** Cards shown at first, and how many more "Sýna fleiri" adds. */
const PAGE = 24;

/** Add `value` to the list, or take it out if it's already there. */
const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/**
 * The front page: pick when (a day of the coming week, today by default,
 * or Í kvöld / Um helgina), then narrow
 * it down with any mix of filters (moods, categories, price, time of day,
 * downtown, open now, deals, search; see filters.ts). Every option shows
 * how many results it would give with the other filters, and options
 * that would give nothing are greyed out.
 */
export function Frontpage({ items, calendar, todayLabel, updatedLabel }: FrontpageProps) {
  const [when, setWhen] = useState<When>(calendar.today);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<FeedItem | null>(null);
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const { age, setAge } = useAgeGroup();

  const syncCategoryQuery = useCallback((category: FeedCategory | null) => {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("flokkur", category);
    else url.searchParams.delete("flokkur");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // Any filter change starts the list from the top again.
  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
    if (patch.categories) {
      syncCategoryQuery(patch.categories.length === 1 ? patch.categories[0] : null);
    }
  };
  const clearAll = () => {
    setFilters(NO_FILTERS);
    setLimit(PAGE);
    syncCategoryQuery(null);
  };

  const haystacks = useMemo(() => new Map(items.map((i) => [i.id, searchText(i)])), [items]);
  const forAge = useMemo(() => (age === "all" ? items : items.filter((i) => fitsAgeGroup(i, age))), [items, age]);
  const inWhen = useMemo(() => forAge.filter((i) => fitsWhen(i, when, calendar)), [forAge, when, calendar]);
  // The curated rows are about today and the weekend, so they are made from those
  // items only, and not shown when a later day is picked.
  const collections = useMemo(
    () => buildCollections(forAge.filter((i) => fitsWhen(i, calendar.today, calendar) || fitsWhen(i, "helgin", calendar)), calendar),
    [forAge, calendar],
  );
  const active = activeCount(filters);
  const laterDay = when !== calendar.today && !WHENS.some((w) => w.id === when);
  // The curated rows are for browsing; once you filter or search, only the grid is shown.
  const browsing = active === 0 && !laterDay;
  // The extra filters in the panel (not moods, categories or search), for the badge on its button.
  const panelActive = filters.times.length + (filters.price ? 1 : 0) + TOGGLES.filter((t) => filters[t.id]).length;

  const matching = useMemo(
    () => inWhen.filter((i) => matches(i, filters, haystacks.get(i.id) ?? "")),
    [inWhen, filters, haystacks],
  );

  // How many results each option would give if picked, with the other filters as they are.
  const counts = useMemo(() => {
    const count = (patch: Partial<Filters>) => {
      const f = { ...filters, ...patch };
      return inWhen.reduce((n, i) => n + (matches(i, f, haystacks.get(i.id) ?? "") ? 1 : 0), 0);
    };
    return {
      // Moods add up (all must fit), so a mood's count is with it added.
      mood: Object.fromEntries(
        MOODS.map((m) => [m.id, count({ moods: filters.moods.includes(m.id) ? filters.moods : [...filters.moods, m.id] })]),
      ) as Record<Mood, number>,
      // Categories are either/or, so a category's count is that category alone.
      category: Object.fromEntries(CATEGORIES.map((c) => [c.id, count({ categories: [c.id] })])) as Record<
        FeedCategory,
        number
      >,
      price: Object.fromEntries(PRICES.map((p) => [p.id, count({ price: p.id })])) as Record<number, number>,
      time: Object.fromEntries(DAY_PARTS.map((t) => [t.id, count({ times: [t.id] })])) as Record<DayPart, number>,
      toggle: Object.fromEntries(TOGGLES.map((t) => [t.id, count({ [t.id]: true })])) as Record<string, number>,
    };
  }, [inWhen, filters, haystacks]);

  const results = useMemo(() => {
    if (when !== "helgin") return mixKinds(matching);
    // The weekend goes day by day, then what is on any day.
    return [
      ...calendar.weekend.flatMap((day) => mixKinds(matching.filter((i) => i.dayKey === day))),
      ...mixKinds(matching.filter((i) => !i.dayKey)),
    ];
  }, [matching, when, calendar]);

  const shown = results.slice(0, limit);
  const groups =
    when === "helgin" ? groupByDay(shown, calendar) : [{ key: "all", heading: null, items: shown }];

  const openRandomizer = useCallback(() => setRandomizerOpen(true), []);

  const chooseRandomCategory = useCallback((next: FeedCategory) => {
    setFilters({ ...NO_FILTERS, categories: [next] });
    setLimit(PAGE);
    syncCategoryQuery(next);
    setRandomizerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [syncCategoryQuery]);

  const openRandomItem = useCallback((item: FeedItem) => {
    setRandomizerOpen(false);
    setOpen(item);
  }, []);

  // "Veldu fyrir mig" from the header (event) or from another page (#random).
  useEffect(() => {
    const onRandom = () => openRandomizer();
    window.addEventListener("hvad:random", onRandom);
    if (window.location.hash === "#random") {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      onRandom();
    }
    return () => window.removeEventListener("hvad:random", onRandom);
  }, [openRandomizer]);

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("flokkur");
    const match = CATEGORIES.find((candidate) => candidate.id === requestedCategory);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize from the requested home filter
      setFilters((current) => ({ ...current, categories: [match.id] }));
    }
  }, []);

  const whenLabel = (WHENS.find((w) => w.id === when)?.label ?? calendar.days.find((d) => d.key === when)?.label ?? "").toLowerCase();
  const pickWhen = (id: When) => {
    setWhen(id);
    setLimit(PAGE);
  };
  // A chip for every filter that is on, each with its own "remove".
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.moods.map((m) => ({
      key: `mood-${m}`,
      label: MOODS.find((x) => x.id === m)!.label,
      remove: () => update({ moods: filters.moods.filter((x) => x !== m) }),
    })),
    ...filters.categories.map((c) => ({
      key: `cat-${c}`,
      label: CATEGORIES.find((x) => x.id === c)!.label,
      remove: () => update({ categories: filters.categories.filter((x) => x !== c) }),
    })),
    ...(filters.price
      ? [{ key: "price", label: PRICES.find((p) => p.id === filters.price)!.label, remove: () => update({ price: null }) }]
      : []),
    ...filters.times.map((t) => ({
      key: `time-${t}`,
      label: DAY_PARTS.find((x) => x.id === t)!.label,
      remove: () => update({ times: filters.times.filter((x) => x !== t) }),
    })),
    ...TOGGLES.filter((t) => filters[t.id]).map((t) => ({
      key: t.id,
      label: t.label,
      remove: () => update({ [t.id]: false }),
    })),
    ...(filters.query.trim() ? [{ key: "query", label: `„${filters.query.trim()}“`, remove: () => update({ query: "" }) }] : []),
  ];

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
          {calendar.days.map((d) => (
            <button
              key={d.key}
              type="button"
              role="radio"
              className={styles.day}
              aria-checked={when === d.key}
              aria-label={calendar.headings[d.key]}
              onClick={() => pickWhen(d.key)}
            >
              <strong>{d.weekday}</strong>
              <small>{d.note}</small>
            </button>
          ))}
          <span className={styles.whenDivider} aria-hidden="true" />
          {WHENS.map((w) => (
            <button key={w.id} type="button" role="radio" aria-checked={when === w.id} onClick={() => pickWhen(w.id)}>
              {w.label}
            </button>
          ))}
        </div>

        <div className={styles.moods} role="group" aria-label="Stemning (veldu eina eða fleiri)">
          {MOODS.map((m) => {
            const on = filters.moods.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={styles.mood}
                data-mood={m.id}
                aria-pressed={on}
                disabled={!on && counts.mood[m.id] === 0}
                onClick={() => update({ moods: toggle(filters.moods, m.id) })}
              >
                <span className={styles.moodCount}>{on ? <Icon name="check" /> : counts.mood[m.id]}</span>
                <strong>{m.label}</strong>
                <small>{m.blurb}</small>
              </button>
            );
          })}
          <button type="button" className={`${styles.mood} ${styles.dice}`} onClick={openRandomizer}>
            <Icon name="dice" />
            <strong>Veldu fyrir mig</strong>
            <small>Komdu mér á óvart</small>
          </button>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.cats} role="group" aria-label="Flokkar (veldu einn eða fleiri)">
          <button
            type="button"
            aria-pressed={filters.categories.length === 0}
            onClick={() => update({ categories: [] })}
          >
            Allt
          </button>
          {CATEGORIES.map((c) => {
            const on = filters.categories.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={!on && counts.category[c.id] === 0}
                onClick={() => update({ categories: toggle(filters.categories, c.id) })}
              >
                {on && <Icon name="check" />}
                {c.label}
                <span className={styles.optCount}>{counts.category[c.id]}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.toolbarEnd}>
          <label className={styles.search}>
            <Icon name="search" />
            <input
              type="search"
              placeholder="Leita…"
              aria-label="Leita að viðburði, stað eða tilboði"
              autoComplete="off"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
            />
          </label>
          <button
            type="button"
            className={styles.filterButton}
            aria-expanded={panelOpen}
            aria-controls="more-filters"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <Icon name="more" />
            Síur
            {panelActive > 0 && <span className={styles.filterBadge}>{panelActive}</span>}
          </button>
        </div>
      </div>

      {panelOpen && (
        <div id="more-filters" className={styles.panel}>
          <FilterGroup label="Verð">
            {PRICES.map((p) => {
              const on = filters.price === p.id;
              return (
                <FilterOption
                  key={p.id}
                  label={p.label}
                  count={counts.price[p.id]}
                  on={on}
                  onClick={() => update({ price: on ? null : p.id })}
                />
              );
            })}
          </FilterGroup>
          <FilterGroup label="Tími dags">
            {DAY_PARTS.map((t) => (
              <FilterOption
                key={t.id}
                label={t.label}
                count={counts.time[t.id]}
                on={filters.times.includes(t.id)}
                onClick={() => update({ times: toggle(filters.times, t.id) })}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Annað">
            {TOGGLES.map((t) => (
              <FilterOption
                key={t.id}
                label={t.label}
                count={counts.toggle[t.id]}
                on={filters[t.id]}
                onClick={() => update({ [t.id]: !filters[t.id] })}
              />
            ))}
          </FilterGroup>
        </div>
      )}

      {chips.length > 0 && (
        <div className={styles.chips} aria-label="Virkar síur">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className={styles.chip} onClick={chip.remove} aria-label={`Fjarlægja síu: ${chip.label}`}>
              {chip.label}
              <Icon name="close" />
            </button>
          ))}
          {chips.length > 1 && (
            <button type="button" className={styles.clearAll} onClick={clearAll}>
              Hreinsa allt
            </button>
          )}
        </div>
      )}

      <AgeFilter hidden={items.length - forAge.length} />

      {browsing && <Collections collections={collections} onOpen={setOpen} />}

      <div className={styles.resultsHead} aria-live="polite">
        <h2>
          {active ? "Síað" : "Allt"} <span>{whenLabel}</span>
        </h2>
        <p>
          {results.length} {results.length % 10 === 1 && results.length % 100 !== 11 ? "hugmynd" : "hugmyndir"}
        </p>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <h3>Ekkert fannst</h3>
          <p>Prófaðu að taka af einhverja síu eða velja annan dag.</p>
          <button
            type="button"
            onClick={() => {
              clearAll();
              setAge("all");
            }}
          >
            Sýna allt
          </button>
        </div>
      ) : (
        groups.map((group, g) => (
          <section key={`${when}-${group.key}`} className={styles.group} aria-label={group.heading ?? undefined}>
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
      <Randomizer
        open={randomizerOpen}
        items={inWhen}
        onClose={() => setRandomizerOpen(false)}
        onChooseCategory={chooseRandomCategory}
        onChooseItem={openRandomItem}
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.panelGroup} role="group" aria-label={label}>
      <span className={styles.panelLabel}>{label}</span>
      <div className={styles.panelOptions}>{children}</div>
    </div>
  );
}

function FilterOption({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} disabled={!on && count === 0} onClick={onClick}>
      {on && <Icon name="check" />}
      {label}
      <span className={styles.optCount}>{count}</span>
    </button>
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
