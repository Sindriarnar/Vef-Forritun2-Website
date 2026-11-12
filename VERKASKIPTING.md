# Verkaskipting: who works on what

The project is split into three areas so three people can work at the same
time on their own branch without editing the same files. Each area has its
own folders and its own style file. A few files are **shared** (see the end):
change those only after telling the others.

| Area | Branch (suggested) | In one sentence |
| --- | --- | --- |
| 1. Gögn og scraper | `gogn` | Getting data from websites into the database, and handing it to the pages |
| 2. Forsíða | `forsida` | The front page (`/`, "Í dag") |
| 3. Undirsíður | `undirsidur` | The other pages: Viðburðir (`/events`), Kort (`/map`), Planið (`/plan`) |

---

## 1. Gögn og scraper (database and scraping)

Owns:

- `scraper/`: everything (one file per website in `scraper/sources/`, shared helpers in `scraper/lib/`)
- `db/schema.sql`: tables and views
- `src/lib/db.ts`: database connection and migrations (`ADDED_COLUMNS`)
- `src/lib/queries.ts`: the SQL the website runs
- `src/lib/feed.ts`: turns rows into `FeedItem`s (`getFeed()` for the front page, `getEventItems()` for events)
- `src/lib/map.ts`: groups everything by place for the map (`getMapPlaces()`)
- `src/lib/format.ts`, `src/lib/match.ts`: dates/prices, movie title matching
- `.env.example`, and the sources table in `README.md`

Typical work: add a source, make a scraper more reliable, add a column, get
coordinates for more places, add a field the pages need.

Check your work with `npm run scrape` (or `npm run scrape -- <slug>` for one
source) and `npm run typecheck`.

## 2. Forsíða (front page)

Owns:

- `src/app/page.tsx`: the route; loads data with `getFeed()` and renders `Feed`
- `src/components/home/`:
  - `PostCard.tsx`: the big photo post (also used for the random pick)
  - `Feed.tsx`, `FeedModules.tsx`, `IdeaCards.tsx`: the current data-backed front page
    (movie shelf, place lists, idea cards, search, category circles).
- `src/styles/home.css`: styles for the parts above

The independent, frontend-only skeleton (`Frontpage.tsx` + `Frontpage.module.css`)
is on `3-búa-til-forsíðu-skeleton`. That branch does not include the database or
scraper implementation from `nextjs-og-scraper`.

## 3. Undirsíður (sub pages)

Owns:

- `src/app/events/page.tsx`, `src/app/map/page.tsx`, `src/app/plan/page.tsx`
- `src/components/subpages/`: `EventsView.tsx`, `PlacesMap.tsx`, `PlanView.tsx`
- `src/styles/events.css`, `src/styles/map.css`, `src/styles/plan.css`

New sub pages (e.g. `/tonlist`) go in `src/app/<name>/page.tsx`, with their
components in `src/components/subpages/`.

---

## Shared files: tell the others before changing these

These are used by more than one area, so a change can break someone else's
page, and two people changing them at once gives merge conflicts.

| File(s) | What it is | Who usually changes it |
| --- | --- | --- |
| `src/lib/feed-types.ts` | `FeedItem` (what every page gets), categories, age-filter rules | Gögn, after agreeing with the page that needs the change |
| `src/lib/map-types.ts` | `MapPlace` / `MapItem` (what the map gets) | Gögn + Undirsíður |
| `src/components/shared/` | Header, details dialog, age filter, filter rows, icons, logo, price, saved items (`SavedProvider`) | Whoever needs it; small changes |
| `src/styles/shared.css` | Colour tokens (`:root`), base styles, buttons/chips/badges, header, dialog, footer | Agree on tokens together |
| `src/app/layout.tsx` | The frame around every page; imports all style files | Rarely |
| `package.json`, `package-lock.json` | Libraries | Say so when you add one |

**The contract between data and pages** is `feed-types.ts` and
`map-types.ts`. The pages only see `FeedItem` / `MapPlace`, never SQL rows, so
the data person can change queries and scrapers freely as long as those
shapes stay the same. Adding a new optional field is safe; renaming or
removing one breaks the pages, so agree on it first.

### Rules of thumb

- Stay inside your folders. Need something from another area? Ask, or make a
  small change and mention it in your pull request.
- New styles go in your own style file, or in a CSS module next to the
  component (`Something.module.css`, like `Frontpage.module.css`). CSS
  modules can't clash with anyone else's class names.
- Use the colour tokens (`var(--accent)`, `var(--muted)`...) instead of
  hard-coded colours, so the theme stays consistent.
- The front-page and sub-page people need data in their own database: run
  `npm run scrape` once (about 10 minutes the first time, because of
  sundlaugar.is; later runs are faster).

---

## Setting up the branches

After the current changes are committed on `nextjs-og-scraper`, each person
makes their branch from it:

```bash
git checkout nextjs-og-scraper
git pull
git checkout -b gogn          # or: forsida / undirsidur
git push -u origin gogn
```

While working, pick up the others' finished work now and then:

```bash
git fetch
git merge origin/nextjs-og-scraper
```

When a piece of work is done, open a pull request from your branch into
`nextjs-og-scraper`. (Don't merge `main` into `nextjs-og-scraper`: it is still
its own branch.)

If the repository is on GitHub, a `.github/CODEOWNERS` file can ask the
right person to review changes in their area automatically. It needs your
GitHub usernames, e.g.:

```
/scraper/                  @gogn-username
/db/                       @gogn-username
/src/lib/                  @gogn-username
/src/components/home/      @forsida-username
/src/styles/home.css       @forsida-username
/src/components/subpages/  @undirsidur-username
```
