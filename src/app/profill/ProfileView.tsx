"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Icon } from "@/components/shared/Icon";
import { useSaved } from "@/components/shared/SavedProvider";
import type { FeedItem } from "@/lib/feed-types";
import { formatDay, formatTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { saveNameAction, signOutAction, type ProfileActionState } from "./actions";
import styles from "./profill.module.css";

interface ProfileViewProps {
  email: string;
  name: string | null;
  maxNameLength: number;
}

function failed(error: unknown): ProfileActionState {
  console.error("Profile action failed", error);
  return { ok: false, message: "Eitthvað fór úrskeiðis. Endurhlaðið síðunni og reynið aftur." };
}

/**
 * The signed-in person's page: their name (asked for the first time they
 * sign in), their email, what's on their plan, and signing out.
 */
export function ProfileView({ email, name: savedName, maxNameLength }: ProfileViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [name, setName] = useState(savedName);
  const [editing, setEditing] = useState(savedName === null);
  const [draft, setDraft] = useState(savedName ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const firstTime = name === null;

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveNameAction(draft).catch(failed);
      setMessage(result.message);
      if (result.ok && result.name) {
        setName(result.name);
        setDraft(result.name);
        setEditing(false);
        router.refresh(); // the header shows the new name
      }
    });
  }

  function signOut() {
    startTransition(async () => {
      try {
        await signOutAction();
      } catch (error) {
        setMessage(failed(error).message);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-head">
        <h1>{firstTime ? "Velkomin/n!" : `Hæ, ${name}`}</h1>
        <p>{firstTime ? "Hvað heitir þú? Nafnið birtist á prófílnum þínum." : email}</p>
      </div>

      {editing ? (
        <form className={styles.form} onSubmit={saveName}>
          <label className={styles.field}>
            Nafn
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={maxNameLength}
              autoFocus
              readOnly={pending}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className={styles.buttons}>
            <button type="submit" className="btn btn-primary" disabled={!hydrated || pending}>
              Vista nafn
            </button>
            {!firstTime && (
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={() => {
                  setDraft(name ?? "");
                  setEditing(false);
                  setMessage("");
                }}
              >
                Hætta við
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className={styles.buttons}>
          <button type="button" className="btn" onClick={() => setEditing(true)} disabled={pending}>
            Breyta nafni
          </button>
          <button type="button" className="btn" onClick={signOut} disabled={!hydrated || pending}>
            Skrá út
          </button>
        </div>
      )}
      <p className="hint" role="status">
        {message}
      </p>

      {!firstTime && <PlannedEvents />}
    </>
  );
}

/** What's on the plan. The plan is still kept in this browser (localStorage). */
function PlannedEvents() {
  const { plan, loaded } = useSaved();
  const items = Object.values(plan).sort(
    (a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999") || a.title.localeCompare(b.title, "is"),
  );

  return (
    <section className={styles.section} aria-labelledby="profile-plan-heading">
      <h2 id="profile-plan-heading" className="section-title">
        Á planinu <span>{loaded ? items.length : ""}</span>
      </h2>
      {loaded && items.length === 0 ? (
        <p className="hint">
          Ekkert á planinu enn. Ýttu á + við eitthvað á <Link href="/">forsíðunni</Link>.
        </p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.when}>{when(item)}</span>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.place}>{item.place}</span>
            </li>
          ))}
        </ul>
      )}
      <Link className="btn btn-small" href="/plan">
        <Icon name="check" />
        Opna planið
      </Link>
    </section>
  );
}

function when(item: FeedItem): string {
  if (!item.startsAt) return item.whenLabel ?? "";
  return `${formatDay(item.startsAt)} kl. ${formatTime(item.startsAt)}`;
}
