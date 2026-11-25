# Graph Report - Vef-Forritun2-Website  (2026-11-25)

## Corpus Check
- Corpus is ~46,547 words - fits in a single context window. You may not need a graph.

## Summary
- 701 nodes · 1817 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.84)
- Token cost: 98,684 input · 0 output

## Community Hubs (Navigation)
- Login & Email Auth
- Page Data & Feed Queries
- Collections & Feed Filters
- Events & Map Pages
- Scraper Runner & Geocoding
- README Project Concepts
- Outing Builder
- Age & Text Heuristics
- Coordinates & Pool Scraper
- Opening Hours Parsing
- Event & Post Cards
- Source Registry & Ideas
- Detail Dialog & Collections UI
- Mall & Cinema Parsers
- Dev Dependencies
- Root Layout & Providers
- Randomizer Wheel
- Deal Site Scrapers
- TypeScript Config
- Feed Modules
- Runtime Dependencies
- npm Scripts
- Showtime Parsing
- ESLint Config
- Build Script Allowlist
- Env Loading
- pnpm Workspace
- App Icon

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 36 edges
2. `FeedItem` - 36 edges
3. `clean()` - 32 edges
4. `react` - 28 edges
5. `getDb()` - 27 edges
6. `useSaved()` - 23 edges
7. `Frontpage()` - 21 edges
8. `next` - 20 edges
9. `absoluteUrl()` - 20 edges
10. `Source` - 17 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `getDb()`  [EXTRACTED]
  scraper/geocode-events.ts → src/lib/db.ts
- `main()` --calls--> `getDb()`  [EXTRACTED]
  scraper/index.ts → src/lib/db.ts
- `saveItems()` --calls--> `matchKey()`  [EXTRACTED]
  scraper/lib/store.ts → src/lib/match.ts
- `parseDealPage()` --calls--> `clean()`  [EXTRACTED]
  scraper/sources/ofurkaup.ts → scraper/lib/text.ts
- `contentLines()` --indirect_call--> `clean()`  [INFERRED]
  scraper/sources/sundlaugar.ts → scraper/lib/text.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data flow: sources -> scraper -> SQLite -> views -> Next.js pages** — readme_source_registry, readme_scraper_pipeline, readme_store_upsert, readme_sqlite, readme_db_schema, readme_v_current_items, readme_nextjs [EXTRACTED 1.00]
- **Pages sharing the age filter** — readme_age_filter, readme_frontpage, readme_events_page, readme_map_page [EXTRACTED 1.00]
- **Coordinate resolution for map pins** — readme_geocoding, readme_plus_code_decoding, readme_source_tix_is, readme_source_happyhour_is, readme_map_page [INFERRED 0.85]

## Communities (28 total, 2 thin omitted)

### Community 0 - "Login & Email Auth"
Cohesion: 0.06
Nodes (56): DEV_TUNNELS, next, clientIp(), LoginActionState, requestCodeAction(), verifyCodeAction(), failed(), LoginForm() (+48 more)

### Community 1 - "Page Data & Feed Queries"
Cohesion: 0.08
Nodes (60): FrontpageData(), Home(), makeCalendar(), metadata, PlanData(), PlanPage(), when(), NoData() (+52 more)

### Community 2 - "Collections & Feed Filters"
Cohesion: 0.10
Nodes (40): buildCollections(), Collection, Rule, RULES, withImagesFirst(), activeCount(), DAY_PARTS, DayPart (+32 more)

### Community 3 - "Events & Map Pages"
Cohesion: 0.09
Nodes (35): leaflet, react, EventsData(), EventsPage(), metadata, SearchParams, MapData(), MapPage() (+27 more)

### Community 4 - "Scraper Runner & Geocoding"
Cohesion: 0.09
Nodes (26): better-sqlite3@^13.0.3, better-sqlite3, GeoapifyResult, isGeoapifyResult(), main(), normalise(), readApiKey(), streetAddress() (+18 more)

### Community 5 - "README Project Concepts"
Cohesion: 0.07
Nodes (28): Cheerio, Database schema (db/schema.sql), Visual theme (Schibsted Grotesk, coral accent, src/styles/shared.css), Viðburðir page (/events), Forsíðan / Í dag (/), Event geocoding via Geoapify (npm run geocode:events), HTML prototype (homepage.html), Hvað á að gera.is (project) (+20 more)

### Community 6 - "Outing Builder"
Cohesion: 0.08
Nodes (31): Budget, BUDGETS, build(), buildOutings(), buildWith(), Day, DAYS, fitsBudget() (+23 more)

### Community 7 - "Age & Text Heuristics"
Cohesion: 0.12
Nodes (31): ageInfo(), ageLimitIn(), ALCOHOL, CATEGORY_DEFAULTS, isFamilyTag(), KIDS_WELCOME, LIMITS, mentionsAlcohol() (+23 more)

### Community 8 - "Coordinates & Pool Scraper"
Cohesion: 0.11
Nodes (24): Coords, coordsFromMapUrl(), decodePlusCode(), flip(), pair(), ApiPool, BY, contentLines() (+16 more)

### Community 9 - "Opening Hours Parsing"
Cohesion: 0.18
Nodes (24): ALL_DAY, DAY_HOURS, DAYS_AHEAD, hoursTableToOccurrences(), MONTHS, parseDayLabel(), parseOpenHours(), parseTimeRanges() (+16 more)

### Community 10 - "Event & Post Cards"
Cohesion: 0.15
Nodes (17): EventCard(), EventCardProps, FeedProps, Avatar(), AVATAR_COLORS, PostActions(), PostCard(), Price() (+9 more)

### Community 11 - "Source Registry & Ideas"
Cohesion: 0.11
Nodes (19): cheerio, Idea, IDEAS, IdeaTag, SUMMER, WINTER, bioparadis, borgarbokasafn (+11 more)

### Community 12 - "Detail Dialog & Collections UI"
Cohesion: 0.20
Nodes (16): PlannedEvents(), Collections(), Poster(), Row(), capitalise(), DetailDialog(), Details(), initials() (+8 more)

### Community 13 - "Mall & Cinema Parsers"
Cohesion: 0.17
Nodes (20): findAddress(), clean(), parseProgram(), DomNode, kringlan, mediumImage(), organisationAddress(), parseKringlan() (+12 more)

### Community 14 - "Dev Dependencies"
Cohesion: 0.13
Nodes (20): devDependencies, tsx@^4.23.15, @types/better-sqlite3@^9.6.0, @types/leaflet@^1.9.22, @types/node@^20, @types/nodemailer@^8.0.2, @types/react@^19, @types/react-dom@^19 (+12 more)

### Community 15 - "Root Layout & Providers"
Cohesion: 0.15
Nodes (12): font, metadata, RootLayout(), viewport, AgeProvider(), IconName, Logo(), LogoMark() (+4 more)

### Community 16 - "Randomizer Wheel"
Cohesion: 0.15
Nodes (17): COLORS, estimateTextMetrics(), fitWheelLabel(), Mode, Phase, pointAt(), prefersReducedMotion(), Randomizer() (+9 more)

### Community 17 - "Deal Site Scrapers"
Cohesion: 0.17
Nodes (15): AgeInfo, CATEGORIES, hopkaup, HopkaupCategoryContent, HopkaupDeal, CATEGORIES, ofurkaup, parseDealPage() (+7 more)

### Community 18 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 19 - "Feed Modules"
Cohesion: 0.30
Nodes (11): Feed(), normalise(), whenOpen(), MovieShelf(), PlaceList(), PlaceRow(), IdeaCards(), AgeFields (+3 more)

### Community 20 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, cheerio@^1.2.0, leaflet@^1.9.4, next@16.4.5, nodemailer@^10.6.1, react@19.3.0, react-dom@19.3.0, robots-parser@^3.0.1 (+3 more)

### Community 21 - "npm Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, geocode:events, lint, scrape, start, typecheck

### Community 22 - "Showtime Parsing"
Cohesion: 0.43
Nodes (5): DomNode, icelandTimeToIso(), DAYS, endTime(), parseShowtimes()

### Community 23 - "ESLint Config"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.5, eslint, eslint-config-next

### Community 24 - "Build Script Allowlist"
Cohesion: 0.67
Nodes (3): allowScripts, better-sqlite3, esbuild

### Community 27 - "App Icon"
Cohesion: 0.67
Nodes (3): App Icon (favicon SVG), Brand Orange-Red #ff5a36 Rounded Square, White Question Mark Glyph

## Knowledge Gaps
- **11 isolated node(s):** `Next.js`, `Cheerio`, `Planið page (/plan)`, `OpenStreetMap`, `Visual theme (Schibsted Grotesk, coral accent, src/styles/shared.css)` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Events & Map Pages` to `Login & Email Auth`, `Page Data & Feed Queries`, `Collections & Feed Filters`, `Outing Builder`, `Event & Post Cards`, `Detail Dialog & Collections UI`, `Dev Dependencies`, `Root Layout & Providers`, `Randomizer Wheel`, `Feed Modules`, `Runtime Dependencies`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **What connects `Next.js`, `Cheerio`, `Planið page (/plan)` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Login & Email Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.06219918548685672 - nodes in this community are weakly interconnected._
- **Why does `cheerio` connect `Source Registry & Ideas` to `Age & Text Heuristics`, `Coordinates & Pool Scraper`, `Opening Hours Parsing`, `Mall & Cinema Parsers`, `Dev Dependencies`, `Deal Site Scrapers`, `Runtime Dependencies`, `Showtime Parsing`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Should `Page Data & Feed Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.07945566286215978 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Login & Email Auth` to `Page Data & Feed Queries`, `Events & Map Pages`, `Event & Post Cards`, `Detail Dialog & Collections UI`, `Dev Dependencies`, `Root Layout & Providers`, `Feed Modules`, `Runtime Dependencies`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `Collections & Feed Filters` be split into smaller, more focused modules?**
  _Cohesion score 0.0971322849213691 - nodes in this community are weakly interconnected._