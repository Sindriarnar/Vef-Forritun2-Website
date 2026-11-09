# Hvað á að gera? — AI concept

Fullmótuð, gagnvirk útfærsla á hugmyndinni að **Hvað á að gera?** Hér er hægt að fara alla leið frá innblæstri að eigin plani, í samræmdu viðmóti fyrir síma og stærri skjái.

Forsíðan er myndrænn straumur í einum dálki, innblásinn af Instagram, með dökku viðmóti. Færslur sýna staðinn efst, stóra mynd með hvítum texta yfir svörtum litstigul og aðgerðir fyrir uppáhald, upplýsingar og plan undir myndinni. Flokkar birtast í láréttri röð af myndahringjum.

## Opna verkefnið

Opnaðu **`index.html`** í vafra. Engin uppsetning, bygging eða nettenging er nauðsynleg fyrir sjálfa upplifunina. Skrárnar verða að haldast saman í þessari möppu.

Skjámyndir af lokahönnuninni: [stærri skjár](previews/desktop.jpg) og [sími](previews/mobile.jpg).

## Upplifunin

- Skoða tilboð og afþreyingu, leita og þrengja val með flokkum.
- Skoða viðburði og nánari upplýsingar um stað, verð og tíma.
- Láta tilviljunina hjálpa við að velja næsta plan.
- Skoða staði á skýringarkorti og tengja hugmynd við staðsetningu.
- Vista uppáhald og bæta hugmyndum á eigið plan með völdum tíma.
- Koma aftur að vistuðu plani og færa það í dagatal.

Viðburðir halda sinni dagsetningu; sveigjanlegar hugmyndir má færa á aðra daga. Tímar sem eru liðnir eru ekki í boði. „Um helgina“ miðast við næstu helgi. Vafraflakk, lyklaborðsflakk og upplýsingagluggar eru útfærð, ásamt tómum niðurstöðum og vali án samsvörunar.

Uppáhald og plan vistast í `localStorage` í vafranum á þessu tæki. Ef vafrinn takmarkar staðbundna geymslu heldur upplifunin áfram í opinni lotu, en gögn geta horfið þegar henni lýkur. Enginn aðgangur eða raunveruleg innskráning er nauðsynleg.

## Hvað er fullgert og hvað eru sýnigögn?

Viðmótið og flæðið eru útfærð sem samhangandi hugmynd að fullbúinni vöru. **Staðir, tilboð, verð, tímar og viðburðir eru sýnigögn.** Engar raunverulegar pantanir, greiðslur eða bókanir fara fram og ekkert er sent til seljanda þegar atriði er sett á planið. Dagsetningar sýnidæmanna miðast við daginn sem síðan er opnuð.

Kortið er myndrænt skýringarkort af Reykjavík með áætluðum punktum; það sækir hvorki GPS-staðsetningu né lifandi kortagögn. Ekki er sótt í lifandi viðburðaskrá eða verðlista.

## Skrár og næsta tækniskref

| Skrá | Hlutverk |
| --- | --- |
| `index.html` | Uppbygging síðna og glugga. |
| `styles.css` | Samræmt útlit, aðlögun að skjástærð og hreyfingar. |
| `feed.css` | Færslustraumur, myndatexti yfir svörtum litstigul og flakk. |
| `dark.css` | Dökkt viðmót, myndahringir og samræmdir litir á öllum skjám. |
| `app.js` | Flakk, síur, upplýsingagluggar, val, uppáhald og plan. |
| `data.js` | Aðskilin íslensk sýnigögn og flokkar. |
| `assets/` | Staðbundnar ljósmyndir og SVG-myndskreytingar. |

Uppbyggingin er viljandi létt og án viðbótarsafna. Við yfirfærslu í Next.js má nota leiðirnar `/`, `/events`, `/map` og `/plan`, skipta útlitinu í endurnýtanlega íhluti og færa `data.js` yfir í gagnalag eða API. Raunveruleg birting myndi einnig þurfa staðfest tilboð, tengingu við seljendur og þjónustu fyrir reikninga og bókanir eftir þörfum.

Ljósmyndir eru endurnýttar úr fyrirliggjandi `homepage.html`; þar og í upprunalega verkefninu eru þær eignaðar Unsplash. Nýju SVG-myndskreytingarnar eru staðbundnar útlitsskrár í þessari möppu.
