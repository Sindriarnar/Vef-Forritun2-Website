"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import { requestCodeAction, verifyCodeAction, type LoginActionState } from "./actions";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./login.module.css";

/**
 * A server action call that never reached our code (network down, the
 * server rejected the request, the page is out of date after a deploy).
 * Shown as a message instead of crashing the form.
 */
function failed(error: unknown): LoginActionState {
  console.error("Login action failed", error);
  return { ok: false, message: "Eitthvað fór úrskeiðis. Endurhlaðið síðunni og reynið aftur." };
}

export function LoginForm() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  // The address the code was actually sent to; the field can't change it later.
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const focusEmail = useCallback((input: HTMLInputElement | null) => {
    if (input?.value) input.focus();
  }, []);
  const focusCode = useCallback((input: HTMLInputElement | null) => {
    input?.focus();
  }, []);

  function sendCode(address: string) {
    startTransition(async () => {
      const result = await requestCodeAction(address).catch(failed);
      setMessage(result.message);
      if (result.ok) {
        setSentTo(address);
        setCode("");
        setStep("code");
      }
    });
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendCode(email);
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await verifyCodeAction(sentTo, code).catch(failed);
      setMessage(result.message);
      if (result.ok) {
        setStep("done");
        // Signed in: the profile asks for a name the first time. A full load
        // so the plan syncs with the account (SavedProvider).
        window.location.replace("/profill");
      }
    });
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setMessage("");
  }

  return (
    <div className={styles.form}>
      {step === "email" && (
        <form className={styles.form} onSubmit={requestCode}>
          <label className={styles.field}>
            Netfang
            <input
              ref={focusEmail}
              type="email"
              name="email"
              autoComplete="email"
              required
              readOnly={pending}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!hydrated || pending}>
            Senda kóða
          </button>
        </form>
      )}
      {step === "code" && (
        <form className={styles.form} onSubmit={verifyCode}>
          <p className="hint" id="login-code-hint">Sláðu inn einnota kóðann fyrir {sentTo}.</p>
          <label className={styles.field}>
            Einnota kóði
            <input
              ref={focusCode}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-describedby="login-code-hint"
              pattern="\s*\d{6}\s*"
              maxLength={8}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!hydrated || pending}>
            Staðfesta kóða
          </button>
          <button type="button" className="btn" onClick={() => sendCode(sentTo)} disabled={pending}>
            Senda kóða aftur
          </button>
          <button type="button" className="btn" onClick={changeEmail} disabled={pending}>
            Breyta netfangi
          </button>
        </form>
      )}
      <p className="hint" role="status">{message}</p>
    </div>
  );
}
