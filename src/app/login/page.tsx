import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAccount } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Innskráning · Hvað á að gera?" };

export default function LoginPage() {
  return (
    <div className="page-shell secondary-page">
      <div className="page-head">
        <h1>Innskráning</h1>
        <p>Skráðu þig inn með einnota kóða sem þú færð í tölvupósti.</p>
      </div>
      <Suspense fallback={null}>
        <AlreadySignedIn />
      </Suspense>
      <LoginForm />
    </div>
  );
}

/** Someone who is already signed in goes straight to their profile. */
async function AlreadySignedIn() {
  if (await getAccount()) redirect("/profill");
  return null;
}
