import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import Link from "next/link";
import { AgeProvider } from "@/components/AgeFilter";
import { LogoMark } from "@/components/Logo";
import { SavedProvider } from "@/components/SavedProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Self-hosted by Next.js at build time: no requests to Google from visitors.
const font = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hvað á að gera í dag?",
  description: "Bíó, tilboð, viðburðir, sund og happy hour í Reykjavík. Allt á einum stað, uppfært daglega.",
};

export const viewport: Viewport = {
  themeColor: "#f7f4ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="is" className={font.variable}>
      <body>
        <SavedProvider>
          <AgeProvider>
            <a className="skip-link" href="#main">
              Fara beint í efni
            </a>
            <SiteHeader />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer className="site-footer">
              <div className="footer-inner">
                <Link href="/" className="footer-brand">
                  <LogoMark />
                  hvað á að gera?
                </Link>
                <p>
                  Nemendaverkefni í Vefforritun 2. Upplýsingar eru sóttar af vefjum fyrirtækjanna sjálfra; athugaðu
                  verð og tíma hjá þeim áður en þú ferð.
                </p>
              </div>
            </footer>
          </AgeProvider>
        </SavedProvider>
      </body>
    </html>
  );
}
