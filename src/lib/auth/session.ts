import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, toIso } from "@/lib/db";

/**
 * Keeping people signed in (issue #50). Server-only.
 *
 * Signing in creates a session: a random token goes into an httpOnly
 * cookie and only its SHA-256 hash is stored in the `sessions` table.
 * Each request looks the cookie up again, so signing out (or deleting the
 * row) ends the session at once.
 */

const COOKIE = "hvad_session";
const SESSION_DAYS = 30;

export interface Account {
  id: number;
  email: string;
  name: string | null;
}

/** Longest name we keep; the form uses the same limit. */
export const MAX_NAME_LENGTH = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Signs this browser in as the account (call from a Server Action). */
export async function startSession(accountId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(toIso(now));
  db.prepare("INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    accountId,
    toIso(now),
    toIso(expires),
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** Signs this browser out (call from a Server Action). */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  jar.delete(COOKIE);
}

/**
 * The signed-in account, or null. Reads the cookie, so the component that
 * calls it is rendered per request (wrap it in <Suspense>). Cached for the
 * rest of the request, so the header and the page share one lookup.
 */
export const getAccount = cache(async (): Promise<Account | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT a.id, a.email, a.display_name AS name
       FROM sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), toIso(new Date())) as Account | undefined;
  return row ?? null;
});

/** Saves the account's name. Returns the cleaned name, or null if it was empty. */
export function setAccountName(accountId: number, raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return null;
  getDb().prepare("UPDATE accounts SET display_name = ? WHERE id = ?").run(name, accountId);
  return name;
}
