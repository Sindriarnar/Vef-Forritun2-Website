import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getDb, toIso } from "@/lib/db";
import { sendLoginCodeEmail } from "./email";

/**
 * One-time email sign-in codes (issue #49). Server-only.
 *
 * - Requesting a code always gives the same answer whether or not an
 *   account exists (accounts are only created on a successful sign-in).
 * - Only an HMAC of each code is stored.
 * - A code is valid for CODE_TTL_MINUTES, for one sign-in, and only while
 *   it is the newest code for that email. Too many wrong guesses kill it.
 * - Requests and verifications are rate-limited per email and per IP.
 *
 * Keeping the user signed in (sessions) is #50; verifyLoginCode returns
 * the account id for that.
 */

export const CODE_TTL_MINUTES = 10;
const CODE_LENGTH = 6;
const MAX_ATTEMPTS_PER_CODE = 5;

// [max events, window in minutes]
// IP limits only apply when the IP is trustworthy (see app/login/actions.ts);
// the global limit caps how many emails the site sends in total.
const LIMITS = {
  "request:email": [5, 15],
  "request:ip": [20, 60],
  "request:global": [200, 60],
  "verify:ip": [30, 15],
} as const satisfies Record<string, readonly [number, number]>;
type LimitKind = keyof typeof LIMITS;

export type RequestResult = { ok: true } | { ok: false; reason: "invalid_email" | "rate_limited" | "send_failed" };
export type VerifyResult = { ok: true; accountId: number } | { ok: false; reason: "invalid_code" | "rate_limited" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

function secret(): string {
  const s = process.env.LOGIN_CODE_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("LOGIN_CODE_SECRET must be set in production");
  return "dev-only-login-code-secret";
}

function hashCode(email: string, code: string): string {
  return createHmac("sha256", secret()).update(`${email}\n${code}`).digest("hex");
}

function minutesFrom(now: Date, minutes: number): string {
  return toIso(new Date(now.getTime() + minutes * 60_000));
}

/** Records an event and reports whether it was over the limit. */
function hitRateLimit(kind: LimitKind, key: string, now: Date): boolean {
  const [max, windowMin] = LIMITS[kind];
  const db = getDb();
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM login_rate_events WHERE kind = ? AND key = ? AND created_at > ?")
    .get(kind, key, minutesFrom(now, -windowMin)) as { n: number };
  if (n >= max) return true;
  db.prepare("INSERT INTO login_rate_events (kind, key, created_at) VALUES (?, ?, ?)").run(kind, key, toIso(now));
  return false;
}

function cleanup(now: Date) {
  const dayAgo = minutesFrom(now, -24 * 60);
  const db = getDb();
  db.prepare("DELETE FROM login_rate_events WHERE created_at < ?").run(dayAgo);
  db.prepare("DELETE FROM login_codes WHERE created_at < ?").run(dayAgo);
}

export async function requestLoginCode(rawEmail: string, ip: string | null): Promise<RequestResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, reason: "invalid_email" };

  const now = new Date();
  const db = getDb();
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

  const limited = db.transaction(() => {
    cleanup(now);
    if (
      (ip !== null && hitRateLimit("request:ip", ip, now)) ||
      hitRateLimit("request:email", email, now) ||
      hitRateLimit("request:global", "all", now)
    ) {
      return true;
    }
    // Supersede every earlier code for this email.
    db.prepare(
      "UPDATE login_codes SET invalidated_at = ? WHERE email = ? AND consumed_at IS NULL AND invalidated_at IS NULL",
    ).run(toIso(now), email);
    db.prepare("INSERT INTO login_codes (email, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      email,
      hashCode(email, code),
      toIso(now),
      minutesFrom(now, CODE_TTL_MINUTES),
    );
    return false;
  })();
  if (limited) return { ok: false, reason: "rate_limited" };

  try {
    await sendLoginCodeEmail(email, code, CODE_TTL_MINUTES);
  } catch (err) {
    console.error("[login] Could not send sign-in code:", err);
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

export function verifyLoginCode(rawEmail: string, rawCode: string, ip: string | null): VerifyResult {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\s+/g, "");
  const now = new Date();
  const nowIso = toIso(now);
  const db = getDb();

  // better-sqlite3 transactions are synchronous, so check-and-consume is atomic.
  return db.transaction((): VerifyResult => {
    if (ip !== null && hitRateLimit("verify:ip", ip, now)) return { ok: false, reason: "rate_limited" };
    if (!email || !new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) return { ok: false, reason: "invalid_code" };

    const row = db
      .prepare(
        `SELECT id, code_hash, attempts FROM login_codes
         WHERE email = ? AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > ?
         ORDER BY created_at DESC, id DESC LIMIT 1`,
      )
      .get(email, nowIso) as { id: number; code_hash: string; attempts: number } | undefined;
    if (!row) return { ok: false, reason: "invalid_code" };

    const expected = Buffer.from(row.code_hash, "hex");
    const actual = Buffer.from(hashCode(email, code), "hex");
    if (!timingSafeEqual(expected, actual)) {
      const attempts = row.attempts + 1;
      db.prepare("UPDATE login_codes SET attempts = ?, invalidated_at = ? WHERE id = ?").run(
        attempts,
        attempts >= MAX_ATTEMPTS_PER_CODE ? nowIso : null,
        row.id,
      );
      return { ok: false, reason: "invalid_code" };
    }

    const consumed = db
      .prepare("UPDATE login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND invalidated_at IS NULL")
      .run(nowIso, row.id);
    if (consumed.changes !== 1) return { ok: false, reason: "invalid_code" };

    const account = db
      .prepare(
        `INSERT INTO accounts (email, last_sign_in_at) VALUES (?, ?)
         ON CONFLICT (email) DO UPDATE SET last_sign_in_at = excluded.last_sign_in_at
         RETURNING id`,
      )
      .get(email, nowIso) as { id: number };
    return { ok: true, accountId: account.id };
  })();
}
