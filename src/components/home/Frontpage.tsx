"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AGE_GROUPS, fitsAgeGroup, type FeedItem } from "@/lib/feed-types";
import { useAgeGroup } from "@/components/shared/AgeFilter";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { PostCard } from "./PostCard";
import styles from "./Frontpage.module.css";

interface FrontpageProps {
  items: FeedItem[];
  todayLabel: string;
  updatedLabel: string;
}

/** A minimal starting point: heading, two tabs, and three feed posts. */
export function Frontpage({ items, todayLabel, updatedLabel }: FrontpageProps) {
  const [open, setOpen] = useState<FeedItem | null>(null);
  const { age, setAge } = useAgeGroup();
  const visible = useMemo(
    () => (age === "all" ? items : items.filter((item) => fitsAgeGroup(item, age))),
    [items, age],
  );

  // Keep the shared header's random action working with the simpler feed.
  const openRandom = useCallback(() => {
    if (visible.length) setOpen(visible[Math.floor(Math.random() * visible.length)]);
  }, [visible]);

  // "Veldu fyrir mig" from the header (event) or from another page (#random).
  // The handler wraps openRandom so the effect only subscribes, which keeps
  // React's set-state-in-effect lint rule happy.
  useEffect(() => {
    const onRandom = () => openRandom();
    window.addEventListener("hvad:random", onRandom);
    if (window.location.hash === "#random") {
      history.replaceState(null, "", "/");
      onRandom();
    }
    return () => window.removeEventListener("hvad:random", onRandom);
  }, [openRandom]);

  return (
    <div className={styles.frontpage}>
      <header className={styles.heading}>
        <h1>Hvað á að gera í dag?</h1>
        <p>{todayLabel}</p>
      </header>

      <nav className={styles.tabs} aria-label="Efni forsíðu">
        <Link href="/" aria-current="page">Fyrir þig</Link>
        <Link href="/events">Viðburðir</Link>
      </nav>

      {age !== "all" && (
        <p className={styles.ageNote}>
          Aldur: {AGE_GROUPS.find((group) => group.id === age)?.label}.{" "}
          <button type="button" onClick={() => setAge("all")}>Sýna alla aldurshópa</button>
        </p>
      )}

      <section aria-label="Tilboð og afþreying">
        {visible.slice(0, 3).map((item) => (
          <PostCard key={item.id} item={item} onOpen={setOpen} />
        ))}
        {visible.length === 0 && (
          <div className="empty">
            <h2>Ekkert í boði núna</h2>
            <p>Skoðaðu viðburði sem eru fram undan.</p>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <Link href="/events">Skoða fleiri viðburði →</Link>
        <p>Síðast uppfært {updatedLabel}.</p>
      </footer>

      <DetailDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
