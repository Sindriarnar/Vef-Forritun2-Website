"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** "Mitt plan": what you put on your plan, and what you saved (♥). */
export function PlanView() {
  const { plan, favorites, loaded, togglePlan, toggleFavorite } = useSaved();
  const planItems = sortByTime(Object.values(plan));
  const favoriteItems = Object.values(favorites);

  return (
    <>
      <div className="section-heading plan-heading">
        <div>
          <p className="eyebrow">
            <span className="live-dot" />
            HUGMYNDIN ER ORÐIN AÐ PLANI
          </p>
          <h1>
            Dagurinn þinn. <em>Á þínum forsendum.</em>
          </h1>
          <p>Allt sem þig langar að gera, á einum stað.</p>
        </div>
      </div>

      <div className="plan-layout">
        <div>
          {loaded && planItems.length === 0 && (
            <div className="empty-state plan-empty">
              <span className="empty-icon">
                <Icon name="calendar" />
              </span>
              <h2>Góður dagur byrjar á einni hugmynd.</h2>
              <p>Veldu eitthvað sem þér líst á og ýttu á „Setja á planið“.</p>
              <Link className="button button-dark" href="/">
                Finna mitt fyrsta plan
                <Icon name="arrow" />
              </Link>
            </div>
          )}
          <div className="plan-list">
            {planItems.map((item) => (
              <PlanCard key={item.id} item={item} onRemove={() => togglePlan(item)} removeLabel="Taka af planinu" />
            ))}
          </div>

          <h2 className="plan-subheading" id="vistad">
            <Icon name="heart" />
            Vistað ({favoriteItems.length})
          </h2>
          {loaded && favoriteItems.length === 0 && (
            <p className="plan-hint">Ýttu á „Vista“ á hugmynd til að geyma hana hér.</p>
          )}
          <div className="plan-list">
            {favoriteItems.map((item) => (
              <PlanCard key={item.id} item={item} onRemove={() => toggleFavorite(item)} removeLabel="Fjarlægja" />
            ))}
          </div>
        </div>

        <aside className="plan-aside">
          <div className="plan-summary">
            <strong>{planItems.length}</strong>
            <span>{planItems.length === 1 ? "hugmynd á planinu" : "hugmyndir á planinu"}</span>
          </div>
          <div className="plan-notice">
            <Icon name="spark" />
            <h3>Smá plan, meiri gleði.</h3>
            <p>Planið vistast í þessum vafra, á þessu tæki.</p>
            <p className="demo-note">Að setja eitthvað á planið jafngildir ekki bókun. Bókaðu á síðu seljanda.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function PlanCard({ item, onRemove, removeLabel }: { item: FeedItem; onRemove: () => void; removeLabel: string }) {
  return (
    <article className="plan-card">
      <div className="plan-card-image">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" />
        )}
      </div>
      <div className="plan-card-copy">
        <span className="plan-date-tag">{item.categoryLabel}</span>
        <h3>{item.title}</h3>
        <p>{[item.place, item.whenLabel, item.priceLabel].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="plan-card-actions">
        <a className="button button-outline" href={item.url} target="_blank" rel="noopener noreferrer">
          Skoða
          <Icon name="external" />
        </a>
        <button className="remove-plan" type="button" onClick={onRemove} aria-label={`${removeLabel}: ${item.title}`}>
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

function sortByTime(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => (a.startsAt ?? "9").localeCompare(b.startsAt ?? "9"));
}
