import "./env";
import { getDb } from "../src/lib/db";
import { PoliteHttp } from "./lib/http";
import { ensureSource, finishRun, loadPrevious, saveItems, startRun } from "./lib/store";
import { sources } from "./sources";

/**
 * Runs the scrapers and stores the results in the SQL database.
 *
 *   npm run scrape               -> every source
 *   npm run scrape -- tix        -> only tix.is
 *   npm run scrape -- tix hopkaup
 */
async function main() {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((slug) => !sources.some((s) => s.slug === slug));
  if (unknown.length) {
    console.error(`Unknown source(s): ${unknown.join(", ")}`);
    console.error(`Available: ${sources.map((s) => s.slug).join(", ")}`);
    process.exit(1);
  }

  const selected = wanted.length ? sources.filter((s) => wanted.includes(s.slug)) : sources;
  const db = getDb();
  const http = new PoliteHttp();
  let failures = 0;

  for (const source of selected) {
    const sourceId = ensureSource(db, source);
    const runId = startRun(db, sourceId);
    const started = Date.now();
    process.stdout.write(`→ ${source.name} ... `);

    try {
      const items = await source.scrape(http, loadPrevious(db, sourceId));
      saveItems(db, sourceId, items);
      finishRun(db, runId, { status: "ok", itemsFound: items.length });
      const showtimes = items.reduce((n, i) => n + (i.occurrences?.length ?? 0), 0);
      console.log(
        `${items.length} items` + (showtimes ? `, ${showtimes} dates/showtimes` : "") +
          ` (${((Date.now() - started) / 1000).toFixed(1)}s)`,
      );
    } catch (error) {
      failures++;
      const message = error instanceof Error ? error.message : String(error);
      finishRun(db, runId, { status: "failed", itemsFound: 0, error: message });
      console.log(`FAILED: ${message}`);
    }
  }

  db.close();
  if (failures) process.exit(1);
}

main();
