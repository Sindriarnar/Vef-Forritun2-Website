"use client";

import { useCallback, useState, type FormEvent } from "react";
import styles from "./login.module.css";

const DELIVERY_UNAVAILABLE = "Sending kóða er ekki virk enn.";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");

  const focusEmail = useCallback((input: HTMLInputElement | null) => {
    if (input?.value) input.focus();
  }, []);
  const focusCode = useCallback((input: HTMLInputElement | null) => {
    input?.focus();
  }, []);

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("code");
    setMessage(DELIVERY_UNAVAILABLE);
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Staðfesting kóða er ekki virk enn.");
  }

  function changeEmail() {
    setStep("email");
    setMessage("");
  }

  return (
    <div className={styles.form}>
      {step === "email" ? (
        <form className={styles.form} onSubmit={requestCode}>
          <label className={styles.field}>
            Netfang
            <input
              ref={focusEmail}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Senda kóða
          </button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={verifyCode}>
          <p className="hint" id="login-code-hint">Sláðu inn einnota kóðann fyrir {email}.</p>
          <label className={styles.field}>
            Einnota kóði
            <input
              ref={focusCode}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-describedby="login-code-hint"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Staðfesta kóða
          </button>
          <button type="button" className="btn" onClick={() => setMessage("Ekki er hægt að endursenda kóða enn.")}>
            Senda kóða aftur
          </button>
          <button type="button" className="btn" onClick={changeEmail}>
            Breyta netfangi
          </button>
        </form>
      )}
      <p className="hint" role="status">{message}</p>
    </div>
  );
}

