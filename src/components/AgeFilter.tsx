"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AGE_GROUPS, ageBadge, ageText, type AgeGroup, type Audience } from "@/lib/feed-types";

/**
 * The age filter ("Aldur"): Allir, 0–14 ára, Fjölskyldan, 15–19 ára or
 * 20+. One choice shared by the front page, events and the map, and
 * remembered in this browser's localStorage.
 */

export type AgeChoice = AgeGroup | "all";

const STORAGE_KEY = "hvad-a-ad-gera:age:v1";
const Context = createContext<{ age: AgeChoice; setAge(age: AgeChoice): void } | null>(null);

export function AgeProvider({ children }: { children: ReactNode }) {
  const [age, setAgeState] = useState<AgeChoice>("all");

  // Read after mount (localStorage doesn't exist on the server).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && AGE_GROUPS.some((g) => g.id === saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
        setAgeState(saved as AgeGroup);
      }
    } catch {
      // Blocked storage: the filter still works, it just isn't remembered.
    }
  }, []);

  const setAge = useCallback((next: AgeChoice) => {
    setAgeState(next);
    try {
      if (next === "all") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore: remembering the choice is a convenience.
    }
  }, []);

  const value = useMemo(() => ({ age, setAge }), [age, setAge]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAgeGroup() {
  const value = useContext(Context);
  if (!value) throw new Error("useAgeGroup must be used inside <AgeProvider>");
  return value;
}

/** The row of age buttons, with a line explaining the chosen group. */
export function AgeFilter() {
  const { age, setAge } = useAgeGroup();
  const chosen = AGE_GROUPS.find((g) => g.id === age);
  return (
    <div className="age-filter">
      <div className="age-filter-row" role="group" aria-label="Aldur">
        <span className="age-filter-label" aria-hidden="true">
          Aldur
        </span>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={age === "all"} onClick={() => setAge("all")}>
            Allir
          </button>
          {AGE_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              className="chip"
              aria-pressed={age === group.id}
              onClick={() => setAge(age === group.id ? "all" : group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>
      {chosen && (
        <p className="age-hint" role="status">
          {chosen.hint}
        </p>
      )}
    </div>
  );
}

/**
 * "20+", "12+" or "Börn" next to a title; nothing for items without an
 * age limit. 20+ (alcohol / 20 ára aldurstakmark) is drawn darker.
 */
export function AgePill({ item }: { item: { minAge?: number | null; audience?: Audience | null } }) {
  const label = ageBadge(item);
  if (!label) return null;
  return (
    <span className="age-pill" data-strong={label === "20+" || undefined} title={ageText(item) ?? undefined}>
      {label}
    </span>
  );
}
