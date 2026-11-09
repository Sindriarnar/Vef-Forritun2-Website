/**
 * Hugmyndabankinn: our own, hand-written ideas for things to do that
 * don't come from any website — free or cheap things for friends, couples
 * or on your own. Edit freely; `npm run scrape` loads them into the
 * database (scraper/sources/hugmyndir.ts).
 *
 * - `months`: only shown in these months (1 = janúar ... 12 = desember).
 *   Leave it out for ideas that work all year.
 * - `url`: optional link to useful information. Only link to pages you
 *   have checked actually exist.
 * - Keep facts general (no prices or opening hours that can go stale).
 */

export type IdeaTag = "Frítt" | "Ódýrt" | "Úti" | "Inni" | "Vinahópur" | "Fyrir tvö" | "Kvöld";

export interface Idea {
  id: string;
  title: string;
  text: string;
  tags: IdeaTag[];
  months?: number[];
  url?: string;
}

const WINTER = [10, 11, 12, 1, 2, 3];
const SUMMER = [5, 6, 7, 8];

export const IDEAS: Idea[] = [
  {
    id: "ulfarsfell",
    title: "Ganga upp á Úlfarsfell",
    text: "Stutt fjallganga rétt við borgina. Tekur um einn til tvo tíma upp og niður og útsýnið yfir höfuðborgarsvæðið er þess virði.",
    tags: ["Frítt", "Úti"],
  },
  {
    id: "nordurljos",
    title: "Norðurljósaveiðar",
    text: "Kíkið á norðurljósaspána, takið með ykkur heitt kakó og keyrið út fyrir ljósin í borginni á heiðskíru kvöldi.",
    tags: ["Frítt", "Úti", "Kvöld", "Vinahópur"],
    months: [9, ...WINTER, 4],
    url: "https://www.vedur.is/vedur/spar/nordurljos/",
  },
  {
    id: "biokvold-heima",
    title: "Bíókvöld heima með þema",
    text: "Veljið þema, til dæmis myndir frá 2000, hrollvekjur eða íslenskar myndir. Hver og einn kemur með eitt snarl.",
    tags: ["Frítt", "Inni", "Kvöld", "Vinahópur"],
  },
  {
    id: "spilakvold",
    title: "Spilakvöld",
    text: "Borðspil, spil eða risastórt púsl. Sá sem tapar velur næsta spil.",
    tags: ["Frítt", "Inni", "Kvöld", "Vinahópur"],
  },
  {
    id: "sundlaugahopp",
    title: "Prófið nýja sundlaug",
    text: "Farið í sundlaug sem þið hafið aldrei prófað áður og takið kalda pottinn með. Opnunartímar sundlauganna eru hér á síðunni.",
    tags: ["Ódýrt", "Úti"],
  },
  {
    id: "grotta",
    title: "Gönguferð út í Gróttu",
    text: "Gangið út á Seltjarnarnes og út að vitanum í Gróttu, helst við sólsetur. Athugið að eyjan lokast á flóði.",
    tags: ["Frítt", "Úti", "Fyrir tvö"],
  },
  {
    id: "elda-saman",
    title: "Eldið saman",
    text: "Hver kemur með eitt hráefni og þið búið til eitthvað úr því saman. Því furðulegri samsetning, því betra.",
    tags: ["Ódýrt", "Inni", "Kvöld", "Vinahópur"],
  },
  {
    id: "myndavelaganga",
    title: "Myndavélaganga",
    text: "Farið í göngutúr með eitt markmið: taka tíu góðar myndir. Berið svo saman og kjósið bestu myndina.",
    tags: ["Frítt", "Úti", "Vinahópur"],
  },
  {
    id: "ellidaardalur",
    title: "Elliðaárdalur",
    text: "Fossar, skógur og stígar inni í miðri borg. Fínt að labba, hlaupa eða hjóla.",
    tags: ["Frítt", "Úti"],
  },
  {
    id: "heidmork",
    title: "Skógarganga í Heiðmörk",
    text: "Stórt útivistarsvæði rétt fyrir utan borgina með fjölda göngustíga. Takið nesti með.",
    tags: ["Frítt", "Úti", "Fyrir tvö"],
  },
  {
    id: "kaffihusarolt",
    title: "Kaffihúsarölt",
    text: "Veljið þrjú kaffihús sem þið hafið aldrei farið á og fáið ykkur eitthvað lítið á hverju.",
    tags: ["Ódýrt", "Inni", "Fyrir tvö"],
  },
  {
    id: "bakstur",
    title: "Bakstursáskorun",
    text: "Allir baka eftir sömu uppskrift og svo er smakkað blint og kosið um bestu útgáfuna.",
    tags: ["Ódýrt", "Inni", "Vinahópur"],
  },
  {
    id: "nautholsvik",
    title: "Sjósund í Nauthólsvík",
    text: "Prófið sjósund á ylströndinni og farið svo beint í heita pottinn. Byrjið rólega ef þið hafið ekki prófað áður.",
    tags: ["Ódýrt", "Úti", "Vinahópur"],
    url: "https://nautholsvik.is/",
  },
  {
    id: "grasagardur",
    title: "Grasagarðurinn í Laugardal",
    text: "Rólegur göngutúr um Grasagarðinn, sérstaklega fallegur á sumrin.",
    tags: ["Frítt", "Úti", "Fyrir tvö"],
    months: [...SUMMER, 9],
    url: "https://grasagardur.is/",
  },
  {
    id: "pikknikk",
    title: "Pikknikk í Hljómskálagarðinum",
    text: "Teppi, nesti og góður félagsskapur við Tjörnina. Hentar vel á björtum sumarkvöldum.",
    tags: ["Ódýrt", "Úti", "Vinahópur"],
    months: SUMMER,
  },
  {
    id: "jolaljos",
    title: "Jólaljósarölt í miðbænum",
    text: "Röltið um miðbæinn, skoðið jólaljósin og gluggana og endið á heitu súkkulaði.",
    tags: ["Ódýrt", "Úti", "Kvöld", "Fyrir tvö"],
    months: [11, 12],
  },
  {
    id: "karoki-heima",
    title: "Karókíkvöld heima",
    text: "Textarnir eru á YouTube. Skiptið ykkur í lið og látið hina velja lögin fyrir ykkur.",
    tags: ["Frítt", "Inni", "Kvöld", "Vinahópur"],
  },
];
