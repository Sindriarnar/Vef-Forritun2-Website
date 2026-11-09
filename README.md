# Vef-Forritun2-Website
Hvað á að gera í dag? Vefsíða

Síðan mun heita "Hvað á að gera í dag", eða "hvadaadgeraidag.is" eða eitthvað svipað. Það mun nota einhverskonar scrape bot til að scrape-a heilmargar síður og safna saman öllu data frá þeim: Hvað er í bíó, sundlaugar, afsláttur á matarstöðum, tilboð á tónleika, og margt annað. Tilgangur síðunnar er að sýna user-inum alla afslátta, tilboð, og bara hluti sem mögulegt er að gera í dag, eða á komandi dögum, til að hann þurfi ekki sjálfur að leita á tugi síðum og öppum.
Síðan verður notleg fyrir flesta, en er helst gerð fyrir ungt fólk á aldrinum 15-25, vinahópa, eða pör.

Fyrir Front-end ætlum við að nota Next.js því

---

## Development setup

**Requirements:** [Node.js](https://nodejs.org/) 22 or newer (developed on Node 26 LTS).

```bash
npm install                    # install dependencies
cp .env.example .env.local     # create your local, git-ignored settings
npm run scrape                 # fill the database with real data
npm run dev                    # http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run scrape` | Runs every scraper and stores the results in the SQL database |
| `npm run scrape -- tix` | Runs one scraper (`kvikmyndir`, `bioparadis`, `smarabio`, `tix`, `hopkaup`, `sundlaugar`, `happyhour`) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |

### Environment variables & secrets

- `.env.example` is the **template** and is committed. It must only contain placeholder values.
- `.env.local` holds your real values (API keys, etc.) and is **ignored by git**. The `.gitignore` ignores every `.env*` file except `.env.example`.
- Variables without the `NEXT_PUBLIC_` prefix are server-only. Never put a secret in a `NEXT_PUBLIC_` variable, because those end up in the browser.
- Before pushing, `git status` should never list `.env.local` or anything in `data/`.

### What goes to GitHub

Only our own source code and config. `.gitignore` keeps everything else local:
libraries (`node_modules/`, re-installed by `npm install`), build output (`.next/`),
secrets (`.env.local`), the scraped database (`data/*.db`), logs and editor files.
`package-lock.json` *is* committed so everyone installs the exact same versions.

To see exactly what would be committed, without staging anything:

```bash
git add --dry-run .
```

### The website

The look follows `Concept og Wireframe/AI concept` (dark, photo-first feed):

| Page | What it shows |
| --- | --- |
| `/` Fyrir þig | Feed mixing deals, today's movies, happy hours, pools/activities open today and events in the next 2 days. Category circles, search (`/` to focus), "Veldu fyrir mig" (random pick) |
| `/events` Viðburðir | Upcoming events with filters: í dag, á morgun, um helgina, næstu 7 daga |
| `/map` Kortið | OpenStreetMap map with every place we have coordinates for |
| `/plan` Mitt plan | Things you put on your plan, and things you saved (♥) |

"Vista" and "Setja á planið" are stored in the browser (`localStorage`), like in the concept, so no accounts are needed yet.
The feed is built in `src/lib/feed.ts` (database rows → `FeedItem`), the styles are in `src/app/globals.css`.

### How the data flows

```
kvikmyndir.is, bioparadis.is, smarabio.is ─┐
tix.is, hopkaup.is                        ─┼─► scraper/ (Node + cheerio) ─► SQLite (data/hvad.db) ─► SQL views ─► Next.js page
reykjavik.is (sundlaugar), happyhour.is   ─┘
```

- **`db/schema.sql`**: tables (`sources`, `venues`, `items`, `occurrences`, `scrape_runs`) and views (`v_current_items`, `v_today`, `v_upcoming`, `v_open_today`, `v_active_deals`). It runs automatically whenever the database is opened.
- **Only current data is shown**: `v_current_items` keeps an item only if it was seen in its source's latest *successful* scrape, so things removed from a site disappear after the next run, while a failed run hides nothing.
- **Changed a table in `db/schema.sql`?** Delete `data/hvad.db` and run `npm run scrape` again, because `CREATE TABLE IF NOT EXISTS` doesn't alter existing tables. (Views are re-created automatically.)
- **Opening hours** (pools, happy hours, Smárabíó's entertainment area) are stored as concrete time slots for the next 7 days (`scraper/lib/schedule.ts`), so "what's open now?" is a simple SQL query.
- **Movies from several sources** are merged on the page by a normalised title (`items.match_key`), so "Iceguys – kvikmyndin" (kvikmyndir.is) and "IceGuys the Movie" (Smárabíó) become one card.
- **`scraper/sources/`**: one file per website. Each returns a list of items; `scraper/lib/store.ts` upserts them into SQL, so re-running the scraper updates rows instead of duplicating them.
- **`scraper/lib/http.ts`**: polite fetching. It respects `robots.txt`, identifies itself with `SCRAPER_USER_AGENT` and waits `SCRAPER_DELAY_MS` between requests to the same site.
- **`src/lib/queries.ts`**: the queries the website runs against the views.
- The database file is git-ignored. Everyone runs `npm run scrape` to build their own.

| Source | What we get |
| --- | --- |
| kvikmyndir.is | Today's showtimes in Icelandic cinemas, with links to buy tickets |
| bioparadis.is | Bíó Paradís program for ~6 days, with subtitle language and series/festival labels |
| smarabio.is | Smárabíó showtimes for the next 7 days (screen: MAX, Lúxus...), plus **Lasertag** (own opening hours, group size), **Leiktækjasalur** (prices) and **Fótboltaland** (no page of its own on the site, so it gets the entertainment area's hours and is only added while the site mentions it) |
| tix.is | Concerts, theatre and events, with dates, venues and prices |
| hopkaup.is | Restaurant and activity deals, with price, original price and discount % |
| reykjavik.is | Opening hours of Reykjavík's 8 pools (incl. holiday hours), address, photo, description |
| happyhour.is | Happy hours: times, weekdays, address and map coordinates |

### Adding a new source

1. Create `scraper/sources/<name>.ts` that exports a `Source` (see `scraper/types.ts`).
2. Register it in `scraper/sources/index.ts`.
3. Check the site's `robots.txt` and terms first, and keep requests to a minimum.
