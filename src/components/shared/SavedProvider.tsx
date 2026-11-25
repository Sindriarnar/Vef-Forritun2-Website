"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FeedItem } from "@/lib/feed-types";

/**
 * "Vista" (favorites) and "Planið", kept in this browser's
 * localStorage. A full copy of each item is saved
 * so the plan page works even after the item leaves the feed.
 */

interface SavedState {
  favorites: Record<string, FeedItem>;
  plan: Record<string, FeedItem>;
}

interface SavedContext extends SavedState {
  loaded: boolean;
  randomizerEnabled: boolean;
  setRandomizerEnabled(enabled: boolean): void;
  isFavorite(id: string): boolean;
  inPlan(id: string): boolean;
  toggleFavorite(item: FeedItem): void;
  togglePlan(item: FeedItem): void;
  /** Open the randomizer (works from any page). */
  requestRandom(): void;
}

const STORAGE_KEY = "hvad-a-ad-gera:saved:v1";
const EMPTY: SavedState = { favorites: {}, plan: {} };
const Context = createContext<SavedContext | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(EMPTY);
  const stateRef = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [randomizerEnabled, setRandomizerEnabled] = useState(true);
  const router = useRouter();

  // Read after mount (localStorage doesn't exist on the server).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      try {
        if (event.storageArea !== localStorage) return;
        const next = parseSavedState(event.newValue);
        stateRef.current = next;
        setState(next);
      } catch {
        // Ignore malformed updates or blocked storage.
      }
    };
    window.addEventListener("storage", onStorage);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parseSavedState(raw);
        stateRef.current = parsed;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
        setState(parsed);
      }
    } catch {
      // Private mode / blocked storage: start empty, keep working in memory.
    }
    setLoaded(true);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((change: (s: SavedState) => SavedState) => {
    let current = stateRef.current;
    try {
      current = parseSavedState(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Keep using in-memory state when storage is unavailable.
    }
    const next = change(current);
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore: saving is a convenience, the page still works.
    }
  }, []);

  const value = useMemo<SavedContext>(() => {
    const toggle = (list: keyof SavedState) => (item: FeedItem) =>
      update((s) => {
        const copy = { ...s[list] };
        if (copy[item.id]) delete copy[item.id];
        else copy[item.id] = item;
        return { ...s, [list]: copy };
      });
    return {
      ...state,
      loaded,
      randomizerEnabled,
      setRandomizerEnabled,
      isFavorite: (id) => Boolean(state.favorites[id]),
      inPlan: (id) => Boolean(state.plan[id]),
      toggleFavorite: toggle("favorites"),
      togglePlan: toggle("plan"),
      requestRandom: () => {
        if (!randomizerEnabled) return;
        if (window.location.pathname === "/") window.dispatchEvent(new Event("hvad:random"));
        else router.push("/#random"); // the home page opens the randomizer when it sees #random
      },
    };
  }, [state, loaded, randomizerEnabled, setRandomizerEnabled, update, router]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSaved(): SavedContext {
  const value = useContext(Context);
  if (!value) throw new Error("useSaved must be used inside <SavedProvider>");
  return value;
}

function parseSavedState(raw: string | null): SavedState {
  if (!raw) return EMPTY;
  const parsed = JSON.parse(raw) as Partial<SavedState>;
  return { favorites: parsed.favorites ?? {}, plan: parsed.plan ?? {} };
}
