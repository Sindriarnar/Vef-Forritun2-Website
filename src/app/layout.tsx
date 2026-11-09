import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SavedProvider } from "@/components/SavedProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hvað á að gera? · Finndu þitt næsta plan",
  description: "Tilboð, bíó, viðburðir, sund og happy hour á einum stað. Finndu eitthvað að gera í dag.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="is">
      <body>
        <SavedProvider>
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
                <Icon name="spark" />
                Hvað á að gera?
              </Link>
              <span>Gerðu meira úr deginum.</span>
              <small>Gögn sótt af vefjum þjónustuaðila · Gert fyrir Reykjavík</small>
            </div>
          </footer>
        </SavedProvider>
      </body>
    </html>
  );
}
