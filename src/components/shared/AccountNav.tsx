import { Suspense } from "react";
import { getAccount } from "@/lib/auth/session";
import { AccountNavLink } from "./AccountNavLink";

/**
 * The account link for the header. Reading the session cookie makes it
 * per-request, so it streams in behind a "Innskráning" placeholder and the
 * rest of every page can stay prerendered.
 */
export function AccountNav() {
  return (
    <Suspense fallback={<AccountNavLink signedIn={false} />}>
      <SignedInAccount />
    </Suspense>
  );
}

async function SignedInAccount() {
  const account = await getAccount();
  return <AccountNavLink signedIn={account !== null} name={account?.name} />;
}
