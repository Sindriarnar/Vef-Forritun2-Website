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

The layout follows our earlier AI concept design (nav rail on desktop, bottom bar
on phones, photo feed with a sidebar); the concept and wireframes are kept on the
`concept` branch. The visual style is our own: a warm light
background with one coral accent, the Schibsted Grotesk typeface, and plain
information instead of slogans. All colours are tokens at the top of
`src/styles/shared.css`, so the theme is easy to change.

The work is split into three areas (data and scrapers, front page, sub pages),
each with its own folders and style file: see **[VERKASKIPTING.md](VERKASKIPTING.md)**.

| Page | What it shows |
| --- | --- |
| `/` Í dag | Deals and events as photo posts, with compact sections in between: activities open today (exhibitions, climbing, bowling, skating, laser tag...), a poster shelf of today's movies, our own ideas, restaurants in the two malls' food halls, happy hours and pools. Late in the evening, when today is over, the sections show tomorrow instead ("Í bíó á morgun", "Sund á morgun"). Age filter, category circles (Afþreying, Viðburðir, Tónlist, Bíó, Matur & drykkur, Sund, Hugmyndir), search (`/` to focus), "Veldu fyrir mig" (random pick) |
| `/events` Viðburðir | Every event for the next 60 days, grouped by day; an event is listed on each day it is on. Age filter, kind of event (Allt / Tónlist), day filters (í dag, á morgun, um helgina, næstu 7 daga) and a date picker ("Velja dag"). `/events?tegund=tonlist` opens with only music |
| `/map` Kort | OpenStreetMap map of the whole country with one pin per place (event venues, pools, bars, activities), coloured by kind. Filters: age and kind. A pin's popup lists what is on there. Places we have an address for but no coordinates (most pools) are listed below the others without a pin |
| `/plan` Planið | Things you put on your plan, and things you saved (♥) |

"Vista", "Á planið" and the chosen age group are stored in the browser (`localStorage`), so no accounts are needed yet.

Where things are:

- `src/lib/feed.ts` turns database rows into `FeedItem`s (all text and dates are formatted on the server).
- `src/lib/feed-types.ts` has the shared types and the age-filter rules (`fitsAgeGroup`).
- `src/lib/map.ts` groups everything by place for the map (`map-types.ts` has its types).
- `src/lib/format.ts` has Icelandic dates/prices without `Intl`, so server and browser render exactly the same text.
- `src/components/home/` is the front page (`Frontpage`, `PostCard`, and the old `Feed` with its movie shelf, place lists and idea cards).
- `src/components/subpages/` has `EventsView`, `PlacesMap` and `PlanView`.
- `src/components/shared/` is used by every page: header, details dialog, age filter, filter rows, icons, price, saved items.
- `src/styles/` has the styles, one file per area: `shared.css` (tokens, header, buttons, dialog...), `home.css`, `events.css`, `map.css`, `plan.css`. They are all imported in `src/app/layout.tsx`.

### Music (Tónlist)

Concerts are events that are also in the "Tónlist" category: on the front page it is one of
the category circles (today's and tomorrow's concerts, with a link to all of them), and on the
events page it is the "Tegund" filter. An event counts as music when the organiser's own tags
say so ("Tónleikar", "Tónlist", "Rokk og popp", "Klassík", "Jazz og blús", "Kór", "Ópera"...)
or its name has "tónleikar" in it; the rule is `isMusic` in `src/lib/feed.ts`. Musicals
("Söngleikur") stay under theatre, and events made for children only count when they are a concert.

### Age filter (Aldur)

Above the feed, the events list and the map: **Allir · 0–14 ára · Fjölskyldan · 15–19 ára · 20+**.
20 is the drinking age in Iceland, so anything with alcohol is only shown under 20+.

The scraper saves two things per item (`items.min_age`, `items.audience`); the rules are in
`scraper/lib/ages.ts`:

| What | How we know |
| --- | --- |
| Alcohol → 20+ | Happy hours; deals and events whose title mentions a drink (bjór, vín, kokteill, mímósa...) |
| Age limits (18+, 20+) | Event descriptions on tix.is: "18 ára aldurstakmark", "Aldurstakmark er 20 ár"... A limit only for the evening shows doesn't count for the whole event |
| Movie ratings | kvikmyndir.is ("Öllum leyfð", "Bönnuð innan 12 ára") and Smárabíó ("Aldurstakmark: 12"). Allowed for everyone or from 9 or younger = family film. Bíó Paradís has no ratings, so its films get the rating of the same film on kvikmyndir.is |
| For children | Library events in the "Börn" category |
| For families | Pools, activities (laser tag, bowling, skating, climbing, museums), tix.is categories like "Fjölskyldan" or "Barna", "frítt fyrir 12 ára og yngri", and ideas marked `family: true` |

The age groups only take away what isn't allowed or meant for that age, so most things show
in all of them:

| Group | Shows |
| --- | --- |
| 0–14 ára | Everything except alcohol and age limits above 14 (and movies whose rating we don't know) |
| Fjölskyldan | Only what is made for children or families |
| 15–19 ára | Everything except children-only events and 20+ (18+ events are shown, marked "18+") |
| 20+ | Everything except children-only events |

Cards show "20+", "16+", "Börn"... and the details dialog says the age. When a group is
chosen, the line under the buttons says how many things it hides ("32 atriði falin. Sýna allt"),
because the choice is remembered and it should be obvious when something is missing because of it.

### Our own ideas (Hugmyndabankinn)

`scraper/content/ideas.ts` is a hand-written list of free or cheap things to do
(walks, game nights, aurora hunting, a home movie night...). Edit it freely:
each idea has a title, a short text, tags (`Frítt`, `Úti`, `Vinahópur`...), an
optional list of months it's shown in, `family: true` if it also works with
children, and an optional link. `npm run scrape` loads the ideas that are in
season into the database, and the site shows them as coloured cards (a
different order each day).

### How the data flows

```
cinemas, tix.is, library, deal sites  ─┐
pools, skating, bowling, climbing,    ─┼─► scraper/ (Node + cheerio) ─► SQLite (data/hvad.db) ─► SQL views ─► Next.js page
malls, art museum, bars, our ideas    ─┘
```

- **`db/schema.sql`**: tables (`sources`, `venues`, `items`, `occurrences`, `scrape_runs`) and views (`v_current_items`, `v_today`, `v_upcoming`, `v_open_soon`, `v_active_deals`). It runs automatically whenever the database is opened.
- **Only current data is shown**: `v_current_items` keeps an item only if it was seen in its source's latest *successful* scrape, so things removed from a site disappear after the next run, while a failed run hides nothing.
- **Changed a table in `db/schema.sql`?** `CREATE TABLE IF NOT EXISTS` doesn't alter existing tables, so either delete `data/hvad.db` and run `npm run scrape` again, or add the new column to `ADDED_COLUMNS` in `src/lib/db.ts` so existing databases get it automatically (that's how `min_age`/`audience` were added). Views are re-created automatically.
- **Opening hours** (pools, happy hours, Smárabíó's entertainment area) are stored as concrete time slots for the next 7 days (`scraper/lib/schedule.ts`), so "what's open now?" is a simple SQL query. `v_open_soon` has every slot that is open now, opens later today or opens tomorrow, so the front page still has something to show after closing time.
- **Movies from several sources** are merged on the page by a normalised title (`items.match_key`, `src/lib/match.ts`), so "Iceguys – kvikmyndin" (kvikmyndir.is) and "IceGuys the Movie" (Smárabíó) become one card, and so do "Fjörður (Fjord)" (Bíó Paradís) and "Fjord".
- **Where coordinates come from**: only from the sources themselves, never from a geocoding service (the free ones, such as OpenStreetMap's Nominatim, don't allow bots in their robots.txt). tix.is publishes coordinates for its venues, happyhour.is has them in its map links, and a few sundlaugar.is pages carry a Google "plus code" that `scraper/lib/geo.ts` decodes. Everything else has an address only.
- **Slow sources remember what they read**: sundlaugar.is has one page per pool (about 100). Each item stores the page's last-modified time in `items.version`, and the next run only fetches pages that changed, so the first run takes a few minutes and later ones a few seconds. ofurkaup.is does the same for its deal pages.
- **No limits before filtering**: the events page gets every event in the period (it used to get the first 80, which cut the list off after about ten days), and the front page gets more events than it shows, so each age group still has a full list.
- **`scraper/sources/`**: one file per website. Each returns a list of items; `scraper/lib/store.ts` upserts them into SQL, so re-running the scraper updates rows instead of duplicating them.
- **`scraper/lib/http.ts`**: polite fetching. It respects `robots.txt`, identifies itself with `SCRAPER_USER_AGENT` and waits `SCRAPER_DELAY_MS` between requests to the same site.
- **`src/lib/queries.ts`**: the queries the website runs against the views.
- The database file is git-ignored. Everyone runs `npm run scrape` to build their own.

| Source | What we get |
| --- | --- |
| kvikmyndir.is | Today's and tomorrow's showtimes in Icelandic cinemas, with links to buy tickets and age ratings |
| bioparadis.is | Bíó Paradís program for ~6 days, with subtitle language and series/festival labels |
| smarabio.is | Smárabíó showtimes for the next 7 days (screen: MAX, Lúxus...) with age ratings, plus **Lasertag** (own opening hours, group size), **Leiktækjasalur** (prices) and **Fótboltaland** (no page of its own on the site, so it gets the entertainment area's hours and is only added while the site mentions it) |
| tix.is | Concerts, theatre and events, with dates, venues (address and coordinates), prices and age limits. The front page and the category pages are read (music, theatre, family, sports, courses, Christmas, festivals): about 380 events instead of the ~160 on the front page |
| hopkaup.is | Restaurant and activity deals, with price, original price and discount % |
| ofurkaup.is | The same kind of deals (restaurants, spa, activities, trips) from all over the country. Product deals are skipped |
| reykjavik.is | Opening hours of Reykjavík's 8 pools (incl. holiday hours), address, photo, description |
| sundlaugar.is | Every pool, lagoon and natural pool in Iceland (about 100): address, region, the size of the pools in the page's own words ("Útisundlaug 25×12 metrar"), photo. No opening hours (every page writes them differently), and coordinates only where the page has a map code |
| happyhour.is | Happy hours: times, weekdays, address and map coordinates |
| borgarbokasafn.is | City Library events: craft evenings, writing workshops, talks, story hours for children (shown under 0–14) |
| listasafnreykjavikur.is | Current exhibitions in Hafnarhús, Kjarvalsstaðir and Ásmundarsafn, with each building's opening hours |
| skautaholl.is | Public skating sessions at Skautahöllin í Laugardal |
| smaralind.is | Smáralind's opening hours, and the 13 restaurants of its food hall (Garðurinn) with their own hours |
| kringlan.is | Kringlan's opening hours and its food hall (Kúmen). Its shop and restaurant lists come from `/api/`, which robots.txt disallows, so they aren't read |
| keiluhollin.is | Bowling hours at Keiluhöllin Egilshöll (the site currently just says "Opið allan daginn", which is what we show) |
| klifurhusid.is | Opening hours of Klifurhúsið (climbing/bouldering) |
| `scraper/content/ideas.ts` | Our own ideas (not scraped) |

### Adding a new source

1. Create `scraper/sources/<name>.ts` that exports a `Source` (see `scraper/types.ts`).
2. Register it in `scraper/sources/index.ts`.
3. Check the site's `robots.txt` and terms first, and keep requests to a minimum.

A place that just publishes weekly opening hours (like the skating rink or the
bowling alley) is only a few lines in `scraper/sources/venues.ts`: the page URL
and the words that come right before the hours.
