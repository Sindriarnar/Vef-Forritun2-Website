/** Shown when the database is empty (the scraper hasn't run yet). */
export function NoData() {
  return (
    <div className="empty no-data">
      <h2>Engin gögn enn</h2>
      <p>
        Keyrðu <code>npm run scrape</code> til að sækja bíó, tilboð, viðburði og fleira.
      </p>
    </div>
  );
}
