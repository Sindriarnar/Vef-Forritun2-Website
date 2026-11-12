import type { Source } from "../types";
import { bioparadis } from "./bioparadis";
import { borgarbokasafn } from "./borgarbokasafn";
import { happyhour } from "./happyhour";
import { hopkaup } from "./hopkaup";
import { hugmyndir } from "./hugmyndir";
import { kvikmyndir } from "./kvikmyndir";
import { listasafn } from "./listasafn";
import { kringlan, smaralind } from "./malls";
import { ofurkaup } from "./ofurkaup";
import { reykjavikPools } from "./reykjavik-pools";
import { smarabio } from "./smarabio";
import { sundlaugar } from "./sundlaugar";
import { tix } from "./tix";
import { keiluhollin, klifurhusid, skautaholl } from "./venues";

/** Every source the scraper runs. Add new sources here. */
export const sources: Source[] = [
  // movies
  kvikmyndir,
  bioparadis,
  smarabio,
  // events
  tix,
  borgarbokasafn,
  // deals
  hopkaup,
  ofurkaup,
  happyhour,
  // places with opening hours
  reykjavikPools,
  skautaholl,
  keiluhollin,
  klifurhusid,
  listasafn,
  smaralind,
  kringlan,
  // every pool in the country (address and size; no opening hours)
  sundlaugar,
  // our own ideas
  hugmyndir,
];
