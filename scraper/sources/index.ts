import type { Source } from "../types";
import { bioparadis } from "./bioparadis";
import { borgarbokasafn } from "./borgarbokasafn";
import { happyhour } from "./happyhour";
import { hopkaup } from "./hopkaup";
import { hugmyndir } from "./hugmyndir";
import { kvikmyndir } from "./kvikmyndir";
import { listasafn } from "./listasafn";
import { reykjavikPools } from "./reykjavik-pools";
import { smarabio } from "./smarabio";
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
  happyhour,
  // places with opening hours
  reykjavikPools,
  skautaholl,
  keiluhollin,
  klifurhusid,
  listasafn,
  // our own ideas
  hugmyndir,
];
