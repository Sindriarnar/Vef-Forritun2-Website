import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/shared.css";

export const metadata: Metadata = {
  title: "Hvað á að gera? — Forsíðuskeleton",
  description: "Einföld grunnuppsetning forsíðu fyrir verkefnið í Vefforritun 2.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is">
      <body>
        <a className="skip-link" href="#main">Fara beint í efni</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Hvað á að gera? Forsíða">
            <span className="brand-mark" aria-hidden="true">?</span>
            hvað á að gera?
          </Link>
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="site-footer">Vefforritun 2 · Grunnuppsetning</footer>
      </body>
    </html>
  );
}
