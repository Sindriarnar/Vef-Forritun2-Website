import type { Metadata } from "next";
import { Suspense } from "react";
import { PlacesMap } from "@/components/PlacesMap";
import { getMapPlaces } from "@/lib/queries";

export const metadata: Metadata = { title: "Kortið · Hvað á að gera?" };

export default function MapPage() {
  return (
    <div className="page-shell secondary-page">
      <div className="section-heading map-heading">
        <div>
          <p className="eyebrow">
            <span className="live-dot" />
            SMÁ ÚT FYRIR HÚSSINS DYR
          </p>
          <h1>
            Gott plan. <em>Rétt hjá.</em>
          </h1>
          <p>Finndu hugmynd á kortinu og skoðaðu staðinn.</p>
        </div>
      </div>
      <Suspense fallback={<p className="loading">Hleð inn korti…</p>}>
        <MapData />
      </Suspense>
    </div>
  );
}

async function MapData() {
  const places = await getMapPlaces();
  if (places.length === 0) {
    return <p className="plan-hint">Engir staðir með staðsetningu enn. Keyrðu npm run scrape.</p>;
  }
  return <PlacesMap places={places} />;
}
