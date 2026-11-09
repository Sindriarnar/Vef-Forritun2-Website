"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeedItem } from "@/lib/feed-types";

/**
 * "Vista" (favorites) and "Mitt plan", kept in this browser's
 * localStorage like in the AI concept. A full copy of each item is saved
 * so the plan page works even after the item leaves the feed.
 */

interface SavedState {
  favorites: Record<string, FeedItem>;
  plan: Record<string, FeedItem>;
}

interface SavedContext extends SavedState {
  loaded: boolean;
  isFavorite(id: string): boolean;
  inPlan(id: string): boolean;
  toggleFavorite(item: FeedItem): void;
  togglePlan(item: FeedItem): void;
  /** Ask the feed to open a random idea (works from any page). */
  requestRandom(): void;
}

const STORAGE_KEY = "hvad-a-ad-gera:saved:v1";
const EMPTY: SavedState = { favorites: {}, plan: {} };
const Context = createContext<SavedContext | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  // Read after mount (localStorage doesn't exist on the server).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
        setState({ favorites: parsed.favorites ?? {}, plan: parsed.plan ?? {} });
      }
    } catch {
      // Private mode / blocked storage: start empty, keep working in memory.
    }
    setLoaded(true);
  }, []);

  const update = useCallback((change: (s: SavedState) => SavedState) => {
    setState((previous) => {
      const next = change(previous);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore: saving is a convenience, the page still works.
      }
      return next;
    });
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
      isFavorite: (id) => Boolean(state.favorites[id]),
      inPlan: (id) => Boolean(state.plan[id]),
      toggleFavorite: toggle("favorites"),
      togglePlan: toggle("plan"),
      requestRandom: () => {
        if (window.location.pathname === "/") window.dispatchEvent(new Event("hvad:random"));
        else router.push("/#random"); // the feed opens a random idea when it sees #random
      },
    };
  }, [state, loaded, update, router]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSaved(): SavedContext {
  const value = useContext(Context);
  if (!value) throw new Error("useSaved must be used inside <SavedProvider>");
  return value;
}
