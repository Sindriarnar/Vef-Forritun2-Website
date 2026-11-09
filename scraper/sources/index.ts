import type { Source } from "../types";
import { bioparadis } from "./bioparadis";
import { happyhour } from "./happyhour";
import { hopkaup } from "./hopkaup";
import { kvikmyndir } from "./kvikmyndir";
import { reykjavikPools } from "./reykjavik-pools";
import { smarabio } from "./smarabio";
import { tix } from "./tix";

/** Every source the scraper runs. Add new sources here. */
export const sources: Source[] = [
  kvikmyndir,
  bioparadis,
  smarabio,
  tix,
  hopkaup,
  reykjavikPools,
  happyhour,
];
