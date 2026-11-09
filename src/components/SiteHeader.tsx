"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { useSaved } from "./SavedProvider";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Fyrir þig", icon: "compass" },
  { href: "/events", label: "Viðburðir", icon: "calendar" },
  { href: "/map", label: "Kortið", icon: "map" },
  { href: "/plan", label: "Mitt plan", icon: "check" },
];

/** Top bar + the main navigation (left rail on desktop, bottom bar on phones). */
export function SiteHeader() {
  const pathname = usePathname();
  const { plan, favorites, loaded, requestRandom } = useSaved();
  const planCount = Object.keys(plan).length;
  const favoriteCount = Object.keys(favorites).length;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Hvað á að gera? Forsíða">
          <span className="brand-mark">
            <Icon name="spark" />
          </span>
          <span>
            Hvað á
            <br />
            að gera<span className="brand-question">?</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Aðalvalmynd">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.href === "/plan" && loaded && planCount > 0 && <span className="nav-count">{planCount}</span>}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="location-button" href="/map">
            <Icon name="pin" />
            Reykjavík
          </Link>
          <button
            className="header-random icon-button"
            type="button"
            onClick={requestRandom}
            aria-label="Láta tilviljunina velja plan"
            title="Veldu fyrir mig"
          >
            <Icon name="spark" />
          </button>
          <Link
            className={`icon-button favorites-button${favoriteCount ? " is-active" : ""}`}
            href="/plan#vistad"
            aria-label={`Vistaðar hugmyndir: ${favoriteCount}`}
            title="Uppáhaldið þitt"
          >
            <Icon name="heart" />
            {loaded && favoriteCount > 0 && <span className="favorite-count">{favoriteCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
