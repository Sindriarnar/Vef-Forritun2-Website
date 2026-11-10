"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { fitsAgeGroup } from "@/lib/feed-types";
import type { MapPlace } from "@/lib/queries";
import { AgeFilter, AgePill, useAgeGroup } from "./AgeFilter";
import { Icon } from "./Icon";

const CATEGORY_LABEL: Record<string, string> = {
  happy_hour: "Happy hour",
  pool: "Sund",
  activity: "Afþreying",
  movie: "Bíó",
  event: "Viðburður",
  food_deal: "Matur & drykkur",
  activity_deal: "Afþreying",
};

/**
 * "Kortið": a real map (OpenStreetMap) with every place the scraper has
 * coordinates for, plus a list next to it.
 */
export function PlacesMap({ places: allPlaces }: { places: MapPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<number, Marker>());
  const [selected, setSelected] = useState<number | null>(null);
  const { age } = useAgeGroup();
  const places = useMemo(
    () =>
      age === "all"
        ? allPlaces
        : allPlaces.filter((p) => fitsAgeGroup({ minAge: p.min_age, audience: p.audience }, age)),
    [allPlaces, age],
  );

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const markerMap = markers.current;
    // Leaflet touches `window`, so load it only in the browser.
    import("leaflet").then((L) => {
      if (cancelled || !container.current || mapRef.current) return;
      const map = L.map(container.current, { zoomControl: true }).setView([64.1355, -21.8954], 12);
      // OpenStreetMap's own tiles: free for light use with attribution
      // (https://operations.osmfoundation.org/policies/tiles/). They are
      // darkened with CSS (see .leaflet-tile-pane in globals.css). A site
      // with real traffic should switch to a tile provider with an API key.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      for (const place of places) {
        const marker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({ className: "map-pin", html: "<span></span>", iconSize: [22, 22] }),
          title: place.title,
        })
          .addTo(map)
          .bindPopup(`<strong>${escapeHtml(place.title)}</strong><br>${escapeHtml(place.address ?? place.venue_name)}`)
          .on("click", () => setSelected(place.item_id));
        markerMap.set(place.item_id, marker);
      }
      if (places.length > 1) {
        map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
      }
      mapRef.current = map;

      // Leaflet measures its box once; re-measure when the layout changes
      // (fonts loading, window resize), otherwise tiles only fill part of it.
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(container.current);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerMap.clear();
    };
  }, [places]);

  function focus(place: MapPlace) {
    setSelected(place.item_id);
    mapRef.current?.flyTo([place.lat, place.lng], 16, { duration: 0.6 });
    markers.current.get(place.item_id)?.openPopup();
  }

  return (
    <>
      <AgeFilter />
      <div className="map-workspace">
        <div className="map-sidebar">
          <div className="map-sidebar-heading">
            <h2>Staðir á kortinu</h2>
            <span>{String(places.length).padStart(2, "0")}</span>
          </div>
          <div className="map-list">
            {places.map((place) => (
              <button
                key={place.item_id}
                type="button"
                className="map-list-item"
                aria-pressed={selected === place.item_id}
                onClick={() => focus(place)}
              >
                {place.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={place.image_url} alt="" loading="lazy" />
                ) : (
                  <span className="map-item-icon">
                    <Icon name="pin" />
                  </span>
                )}
                <span className="map-item-copy">
                  <strong>
                    {place.title}
                    <AgePill item={{ minAge: place.min_age, audience: place.audience }} />
                  </strong>
                  <small>{CATEGORY_LABEL[place.category] ?? place.category}</small>
                  {place.address && <span>{place.address}</span>}
                </span>
              </button>
            ))}
            {places.length === 0 && <p className="hint">Engir staðir á kortinu fyrir þennan aldurshóp.</p>}
          </div>
        </div>
        <div className="map-canvas" ref={container} aria-label="Kort af Reykjavík með stöðum" />
      </div>
    </>
  );
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
