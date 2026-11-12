"use client";

import { useState, type KeyboardEvent } from "react";
import styles from "./Frontpage.module.css";

const TABS = ["Fyrir þig", "Viðburðir"];
const POSTS = [1, 2, 3];

/** Static placeholders for the front page; no data connection yet. */
export function Frontpage() {
  const [activeTab, setActiveTab] = useState(0);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(next);
    document.getElementById(`frontpage-tab-${next}`)?.focus();
  }

  return (
    <div className={styles.frontpage}>
      <header className={styles.heading}>
        <h1>Hvað á að gera í dag?</h1>
        <p>Grunnuppsetning forsíðu</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Efni forsíðu">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            id={`frontpage-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`frontpage-panel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {tab}
          </button>
        ))}
      </div>

      {TABS.map((tab, index) => (
        <section
          key={tab}
          id={`frontpage-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`frontpage-tab-${index}`}
          tabIndex={0}
          hidden={activeTab !== index}
        >
          {POSTS.map((post) => (
            <article className={styles.post} key={post}>
              <header className={styles.postHeader}>
                <span className={styles.avatar} aria-hidden="true" />
                <div><strong>Staður</strong><p>Staðsetning kemur hér</p></div>
              </header>
              <div className={styles.imagePlaceholder}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="6" y="8" width="36" height="32" rx="3" />
                  <circle cx="17" cy="18" r="4" />
                  <path d="m8 36 11-11 8 8 6-6 9 9" />
                </svg>
                <span>Mynd kemur hér</span>
              </div>
              <div className={styles.postBody}>
                <h2>{index === 0 ? "Titill tilboðs" : "Titill viðburðar"}</h2>
                <p>Stutt lýsing kemur hér</p>
                <p className={styles.metadata}>Staðsetning · Tími · Verð</p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
