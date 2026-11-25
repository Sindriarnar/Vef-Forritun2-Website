"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { useSaved } from "./SavedProvider";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Í dag", icon: "compass" },
  { href: "/events", label: "Viðburðir", icon: "calendar" },
  { href: "/map", label: "Kort", icon: "map" },
  { href: "/plan", label: "Planið", icon: "check" },
];

/**
 * þetta er bara til að sýna notanda sem er innskráður, ekki til að skrá notanda inn. Það er gert í LoginForm.tsx mbk Sölvi :)
 */
export function SiteHeader({ account }: { account: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { plan, favorites, loaded, requestRandom } = useSaved();
  const planCount = Object.keys(plan).length;
  const favoriteCount = Object.keys(favorites).length;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Hvað á að gera? Forsíða">
          <Logo />
        </Link>

        <nav className="main-nav" aria-label="Aðalvalmynd">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={hydrated && pathname === item.href ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.href === "/plan" && loaded && planCount > 0 && <span className="nav-count">{planCount}</span>}
            </Link>
          ))}
          {account}
        </nav>

        <div className="header-actions">
          <button className="header-button" type="button" onClick={requestRandom} title="Veldu eitthvað fyrir mig">
            <Icon name="dice" />
            <span>Veldu fyrir mig</span>
          </button>
          <Link
            className="icon-button"
            href="/plan#vistad"
            aria-label={`Vistað: ${favoriteCount}`}
            title="Vistað"
            data-active={favoriteCount > 0 || undefined}
          >
            <Icon name="heart" className="icon-heart" />
            {loaded && favoriteCount > 0 && <span className="badge-count">{favoriteCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
