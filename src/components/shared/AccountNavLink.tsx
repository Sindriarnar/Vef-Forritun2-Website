"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { Icon } from "./Icon";

/**
 * The last item in the main navigation: "Innskráning" when signed out,
 * the person's name (or "Prófíll") linking to /profill when signed in.
 */
export function AccountNavLink({ signedIn, name }: { signedIn: boolean; name?: string | null }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const href = signedIn ? "/profill" : "/login";
  const current = hydrated && (pathname === "/profill" || pathname === "/login");
  return (
    <Link href={href} className="nav-link" aria-current={current ? "page" : undefined}>
      <Icon name="user" />
      {/* First name only, so a long name fits the rail and the bottom bar. */}
      <span>{signedIn ? name?.split(" ")[0] || "Prófíll" : "Innskráning"}</span>
    </Link>
  );
}
