"use server";

import { getAccount } from "@/lib/auth/session";
import { getDb, toIso } from "@/lib/db";
import type { FeedItem } from "@/lib/feed-types";

type Plan = Record<string, FeedItem>;

// Plenty for hundreds of items; stops someone filling the database.
const MAX_PLAN_CHARS = 500_000;

/** The signed-in account and its saved plan (null if none saved yet), or null when signed out. */
export async function loadPlanAction(): Promise<{ accountId: number; plan: Plan | null } | null> {
  const account = await getAccount();
  if (!account) return null;
  const row = getDb().prepare("SELECT plan_json FROM account_plans WHERE account_id = ?").get(account.id) as
    | { plan_json: string }
    | undefined;
  return { accountId: account.id, plan: row ? (JSON.parse(row.plan_json) as Plan) : null };
}

/** Saves the plan to the signed-in account. Does nothing when signed out. */
export async function savePlanAction(plan: Plan): Promise<void> {
  const account = await getAccount();
  if (!account) return;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return;
  const json = JSON.stringify(plan);
  if (json.length > MAX_PLAN_CHARS) return;
  getDb()
    .prepare(
      `INSERT INTO account_plans (account_id, plan_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (account_id) DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at`,
    )
    .run(account.id, json, toIso(new Date()));
}
