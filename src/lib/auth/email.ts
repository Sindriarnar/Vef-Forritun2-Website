import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends sign-in code emails. Server-only.
 *
 * EMAIL_DELIVERY picks how (see .env.example):
 *   - "console" (default outside production): prints the code in the
 *     server log, so sign-in works locally without an email account.
 *   - "gmail": sends from a Gmail account over SMTP (GMAIL_USER and
 *     GMAIL_APP_PASSWORD, an app password, not the account password).
 *   - "resend": sends through the Resend HTTP API (RESEND_API_KEY,
 *     EMAIL_FROM).
 */

export async function sendLoginCodeEmail(to: string, code: string, minutesValid: number) {
  const delivery = process.env.EMAIL_DELIVERY ?? (process.env.NODE_ENV === "production" ? "" : "console");
  const subject = `Innskráningarkóði: ${code}`;
  const text =
    `Kóðinn þinn til að skrá þig inn á Hvað á að gera? er ${code}\n\n` +
    `Hann gildir í ${minutesValid} mínútur og aðeins einu sinni.\n` +
    `Ef þú baðst ekki um þennan kóða geturðu hunsað þennan póst.`;

  switch (delivery) {
    case "console":
      console.info(`[login] Sign-in code for ${to}: ${code} (EMAIL_DELIVERY=console)`);
      return;
    case "gmail": {
      const user = process.env.GMAIL_USER;
      const from = process.env.EMAIL_FROM || `"Hvað á að gera?" <${user}>`;
      await gmail().sendMail({ from, to, subject, text });
      return;
    }
    case "resend": {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM;
      if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM must be set");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Resend returned ${res.status}: ${await res.text()}`);
      return;
    }
    default:
      throw new Error(`EMAIL_DELIVERY is not configured (got "${delivery}")`);
  }
}

// One SMTP connection pool per process, kept on globalThis so hot reloads
// in `next dev` don't open a new one each time (same as the db connection).
const globalForMail = globalThis as unknown as { __hvadGmail?: Transporter };

function gmail(): Transporter {
  if (globalForMail.__hvadGmail) return globalForMail.__hvadGmail;
  const user = process.env.GMAIL_USER;
  // Google shows app passwords in groups of four ("abcd efgh ..."); spaces don't matter.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  globalForMail.__hvadGmail = nodemailer.createTransport({ service: "gmail", pool: true, auth: { user, pass } });
  return globalForMail.__hvadGmail;
}
