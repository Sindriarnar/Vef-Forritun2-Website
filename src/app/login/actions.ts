"use server";

import { headers } from "next/headers";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth/login-codes";
import { startSession } from "@/lib/auth/session";

export type LoginActionState = { ok: boolean; message: string };

/**
 * The client IP, for rate limiting. Forwarding headers can be faked by
 * the caller, so they are only used when TRUST_PROXY_HEADERS=true, i.e.
 * the app runs behind a proxy that overwrites them. Otherwise null, and
 * only the per-email, per-code and global limits apply.
 */
async function clientIp(): Promise<string | null> {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return null;
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function requestCodeAction(email: string): Promise<LoginActionState> {
  const result = await requestLoginCode(String(email ?? ""), await clientIp());
  if (result.ok) {
    // Same message whether or not an account exists for this email.
    return { ok: true, message: "Ef netfangið er gilt sendum við þangað kóða. Hann gildir í 10 mínútur." };
  }
  switch (result.reason) {
    case "invalid_email":
      return { ok: false, message: "Sláðu inn gilt netfang." };
    case "rate_limited":
      return { ok: false, message: "Of margar beiðnir. Bíddu aðeins og reyndu aftur." };
    case "send_failed":
      return { ok: false, message: "Ekki tókst að senda kóða. Reyndu aftur síðar." };
  }
}

export async function verifyCodeAction(email: string, code: string): Promise<LoginActionState> {
  const result = verifyLoginCode(String(email ?? ""), String(code ?? ""), await clientIp());
  if (result.ok) {
    await startSession(result.accountId);
    // The form then goes to /profill, which asks for a name if there is none yet.
    return { ok: true, message: "Kóðinn er staðfestur. Þú ert skráð/ur inn." };
  }
  return result.reason === "rate_limited"
    ? { ok: false, message: "Of margar tilraunir. Bíddu aðeins og reyndu aftur." }
    : { ok: false, message: "Kóðinn er rangur eða útrunninn. Reyndu aftur eða biddu um nýjan kóða." };
}
