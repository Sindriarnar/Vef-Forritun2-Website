import { Icon } from "./Icon";

/** Shown when the database is empty (the scraper hasn't run yet). */
export function NoData() {
  return (
    <div className="empty-state no-data">
      <span className="empty-icon">
        <Icon name="search" />
      </span>
      <h2>Engin gögn enn.</h2>
      <p>
        Keyrðu <code>npm run scrape</code> til að sækja tilboð, bíó, viðburði og fleira.
      </p>
    </div>
  );
}
