# Vef-Forritun2-Website
Hvað á að gera í dag? Vefsíða

## Forsíðuskeleton

Branch: `3-búa-til-forsíðu-skeleton`.

Einfalt Next.js-skeleton með haus, tveimur flipum og þremur staðgengilskortum. Þetta er eingöngu grunnuppsetning viðmóts: engin gagnagrunnstenging, scraper, API eða raunveruleg tilboð fylgja þessari útfærslu. Engar umhverfisbreytur þarf.

```sh
npm install
npm run dev
```

Opnaðu `http://localhost:3000` í vafra. `npm run typecheck` athugar týpur og `npm run build` byggir verkefnið.

- `src/app/page.tsx` birtir forsíðuna.
- `src/components/home/Frontpage.tsx` og `Frontpage.module.css` innihalda skeletonið.
- `src/app/layout.tsx` og `src/styles/shared.css` innihalda einfaldan ramma og grunnstíla.

Eldri hugmyndavinna í `Concept og Wireframe/` er hluti af sögu `main` og er óbreytt.

Síðan mun heita "Hvað á að gera í dag", eða "hvadaadgeraidag.is" eða eitthvað svipað. Það mun nota einhverskonar scrape bot til að scrape-a heilmargar síður og safna saman öllu data frá þeim: Hvað er í bíó, sundlaugar, afsláttur á matarstöðum, tilboð á tónleika, og margt annað. Tilgangur síðunnar er að sýna user-inum alla afslátta, tilboð, og bara hluti sem mögulegt er að gera í dag, eða á komandi dögum, til að hann þurfi ekki sjálfur að leita á tugi síðum og öppum.
Síðan verður notleg fyrir flesta, en er helst gerð fyrir ungt fólk á aldrinum 15-25, vinahópa, eða pör.

Fyrir Front-end ætlum við að nota Next.js því
