import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAccount, MAX_NAME_LENGTH } from "@/lib/auth/session";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Prófíll · Hvað á að gera?" };

export default function ProfilePage() {
  return (
    <div className="page-shell secondary-page">
      <Suspense fallback={<p className="loading">Sæki prófílinn…</p>}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return <ProfileView email={account.email} name={account.name} maxNameLength={MAX_NAME_LENGTH} />;
}
