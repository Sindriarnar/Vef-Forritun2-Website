"use client";

import { useState, type FormEvent } from "react";
import styles from "./login.module.css";

/**
 * Einfalt innskráningarform. Gerir ekkert enn: tengið innskráninguna í
 * handleSubmit (t.d. kalla á API route eða server action).
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: senda { email, password } á innskráninguna þegar hún er komin.
    setMessage("Innskráning er ekki tengd enn.");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Netfang
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        Lykilorð
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary">
        Skrá inn
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
