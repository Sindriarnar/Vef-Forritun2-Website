"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadPlanAction, savePlanAction } from "@/app/plan/actions";
import type { FeedItem } from "@/lib/feed-types";

/**
 * "Vista" (favorites) and "Planið", kept in this browser's
 * localStorage. A full copy of each item is saved
 * so the plan page works even after the item leaves the feed.
 *
 * When signed in, the plan is also saved to the account (app/plan/actions.ts)
 * so it follows the person between devices. On page load:
 *  - this browser already synced with that account: the account's plan wins
 *    (so something removed on another device stays removed);
 *  - otherwise (first sign-in here): the two plans are merged, so nothing
 *    added while signed out is lost.
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
  /** Open the randomizer (works from any page). */
  requestRandom(): void;
}

const STORAGE_KEY = "hvad-a-ad-gera:saved:v1";
// The account id this browser's plan was last synced with.
const PLAN_ACCOUNT_KEY = "hvad-a-ad-gera:plan-account";
const EMPTY: SavedState = { favorites: {}, plan: {} };
const Context = createContext<SavedContext | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(EMPTY);
  const stateRef = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const signedIn = useRef(false); // plan changes are saved to the account
  const router = useRouter();

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
    if (signedIn.current && next.plan !== current.plan) {
      savePlanAction(next.plan).catch(() => {
        // Not saved to the account this time; it is still in this browser and goes up with the next change.
      });
    }
  }, []);

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

    let cancelled = false;
    loadPlanAction()
      .then((account) => {
        if (cancelled) return;
        if (!account) return forgetSyncedAccount(); // signed out: next sign-in merges again
        const mirror = readSyncedAccount() === String(account.accountId);
        signedIn.current = true;
        update((s) => ({ ...s, plan: mirror && account.plan ? account.plan : { ...account.plan, ...s.plan } }));
        rememberSyncedAccount(account.accountId);
      })
      .catch(() => {
        // Offline or server error: keep the local plan.
      });
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [update]);

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
        else router.push("/#random"); // the home page opens the randomizer when it sees #random
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

// localStorage can throw (private mode, blocked storage); syncing then just merges each time.
function readSyncedAccount(): string | null {
  try {
    return localStorage.getItem(PLAN_ACCOUNT_KEY);
  } catch {
    return null;
  }
}
function rememberSyncedAccount(id: number) {
  try {
    localStorage.setItem(PLAN_ACCOUNT_KEY, String(id));
  } catch {}
}
function forgetSyncedAccount() {
  try {
    localStorage.removeItem(PLAN_ACCOUNT_KEY);
  } catch {}
}

function parseSavedState(raw: string | null): SavedState {
  if (!raw) return EMPTY;
  const parsed = JSON.parse(raw) as Partial<SavedState>;
  return { favorites: parsed.favorites ?? {}, plan: parsed.plan ?? {} };
}
