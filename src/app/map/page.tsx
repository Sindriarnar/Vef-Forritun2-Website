import type { Metadata } from "next";
import { Suspense } from "react";
import { PlacesMap } from "@/components/subpages/PlacesMap";
import { getMapPlaces } from "@/lib/map";

export const metadata: Metadata = { title: "Kort · Hvað á að gera?" };

export default function MapPage() {
  return (
    <div className="page-shell secondary-page">
      <div className="page-head">
        <h1>Kort</h1>
        <p>Viðburðir, sundlaugar, veitingastaðir og afþreying um allt land.</p>
      </div>
      <Suspense fallback={<p className="loading">Sæki kort…</p>}>
        <MapData />
      </Suspense>
    </div>
  );
}

async function MapData() {
  const places = await getMapPlaces();
  if (places.length === 0) {
    return <p className="hint">Engir staðir enn. Keyrðu npm run scrape.</p>;
  }
  return <PlacesMap places={places} />;
}
