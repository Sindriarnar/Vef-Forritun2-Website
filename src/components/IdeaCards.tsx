"use client";

import { useState } from "react";
import type { FeedItem } from "@/lib/feed-types";
import { Icon } from "./Icon";
import { useSaved } from "./SavedProvider";

/** Our own ideas: coloured note cards, no photos needed. */
export function IdeaCards({
  ideas,
  limit,
  onOpen,
}: {
  ideas: FeedItem[];
  limit?: number;
  onOpen: (item: FeedItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { isFavorite, inPlan, toggleFavorite, togglePlan } = useSaved();
  if (ideas.length === 0) return null;
  const shown = limit && !expanded ? ideas.slice(0, limit) : ideas;

  return (
    <section className="module module-ideas" aria-labelledby="ideas-heading">
      <div className="module-head">
        <h2 id="ideas-heading">Hugmyndir</h2>
        <span>Ókeypis eða ódýrt, engin bókun</span>
      </div>
      <ul className="idea-grid">
        {shown.map((idea, i) => {
          const saved = isFavorite(idea.id);
          const planned = inPlan(idea.id);
          return (
            <li key={idea.id} className="idea" data-tone={i % 5}>
              <button type="button" className="idea-open" onClick={() => onOpen(idea)}>
                <strong>{idea.title}</strong>
                <span>{idea.description}</span>
              </button>
              <div className="idea-foot">
                <span className="idea-tags">{idea.tags?.slice(0, 3).join(" · ")}</span>
                <span className="idea-actions">
                  <button
                    type="button"
                    className="icon-toggle"
                    aria-pressed={saved}
                    onClick={() => toggleFavorite(idea)}
                    aria-label={`${saved ? "Fjarlægja úr vistuðu" : "Vista"}: ${idea.title}`}
                  >
                    <Icon name="heart" className="icon-heart" />
                  </button>
                  <button
                    type="button"
                    className="icon-toggle"
                    aria-pressed={planned}
                    onClick={() => togglePlan(idea)}
                    aria-label={`${planned ? "Taka af planinu" : "Setja á planið"}: ${idea.title}`}
                  >
                    <Icon name={planned ? "check" : "plus"} />
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {limit && ideas.length > limit && (
        <button type="button" className="module-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Sýna færri" : `Fleiri hugmyndir (${ideas.length})`}
        </button>
      )}
    </section>
  );
}
