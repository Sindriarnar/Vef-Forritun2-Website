"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { fitsAgeGroup } from "@/lib/feed-types";
import { MAP_GROUPS, type MapGroup, type MapItem, type MapPlace } from "@/lib/map-types";
import { AgeFilter, AgePill, useAgeGroup } from "@/components/shared/AgeFilter";
import { FilterRow } from "@/components/shared/FilterRow";
import { Icon } from "@/components/shared/Icon";

/** A place that has coordinates, i.e. a pin. */
type PinnedPlace = MapPlace & { lat: number; lng: number };

/** The whole country, used until the pins are placed (and when there are none). */
const ICELAND: [number, number] = [64.95, -18.8];

/**
 * "Kortið": a real map (OpenStreetMap) with one pin per place, coloured
 * by what is there, and the same places as a list next to it. Places
 * we don't have coordinates for (most pools outside Reykjavík) are in
 * the list without a pin.
 */
export function PlacesMap({ places: allPlaces }: { places: MapPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinsRef = useRef<LayerGroup | null>(null);
  const markers = useRef(new Map<number, Marker>());
  const [mapReady, setMapReady] = useState(false);
  const [group, setGroup] = useState<MapGroup | "all">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const { age } = useAgeGroup();

  const forAge = useMemo(
    () => keepItems(allPlaces, (item) => age === "all" || fitsAgeGroup(item, age)),
    [allPlaces, age],
  );
  const places = useMemo(() => keepItems(forAge, (item) => group === "all" || item.group === group), [forAge, group]);
  const pinned = useMemo(() => places.filter((p): p is PinnedPlace => p.lat !== null && p.lng !== null), [places]);
  const unpinned = places.filter((p) => p.lat === null || p.lng === null);
  const groupsShown = MAP_GROUPS.filter((g) => forAge.some((p) => p.items.some((i) => i.group === g.id)));
  const hiddenByAge = countItems(allPlaces) - countItems(forAge);

  // The map itself, created once.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    // Leaflet touches `window`, so load it only in the browser.
    import("leaflet").then((L) => {
      if (cancelled || !container.current || mapRef.current) return;
      const map = L.map(container.current, { zoomControl: true }).setView(ICELAND, 6);
      // OpenStreetMap's own tiles: free for light use with attribution
      // (https://operations.osmfoundation.org/policies/tiles/). A site
      // with real traffic should switch to a tile provider with an API key.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      pinsRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      // Leaflet measures its box once; re-measure when the layout changes
      // (fonts loading, window resize), otherwise tiles only fill part of it.
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(container.current);
      setMapReady(true);
    });

    const markerMap = markers.current;
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      pinsRef.current = null;
      markerMap.clear();
    };
  }, []);

  // The pins: replaced whenever the filters change, and the map moves to show them all.
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      const pins = pinsRef.current;
      if (cancelled || !map || !pins) return;

      pins.clearLayers();
      markers.current.clear();
      for (const place of pinned) {
        const marker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({ className: `map-pin map-pin-${place.items[0].group}`, html: "<span></span>", iconSize: [22, 22] }),
          title: place.name,
        })
          .bindPopup(popupHtml(place), { maxWidth: 280 })
          .on("click", () => setSelected(place.id));
        marker.addTo(pins);
        markers.current.set(place.id, marker);
      }

      if (pinned.length > 1) {
        map.fitBounds(L.latLngBounds(pinned.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 14 });
      } else if (pinned.length === 1) {
        map.setView([pinned[0].lat, pinned[0].lng], 13);
      } else {
        map.setView(ICELAND, 6);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mapReady, pinned]);

  function focus(place: PinnedPlace) {
    setSelected(place.id);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    markers.current.get(place.id)?.openPopup();
  }

  return (
    <>
      <AgeFilter hidden={hiddenByAge} />

      <div className="filter-group">
        <FilterRow label="Sýna">
          <button type="button" className="chip" aria-pressed={group === "all"} onClick={() => setGroup("all")}>
            Allt
          </button>
          {groupsShown.map((g) => (
            <button
              key={g.id}
              type="button"
              className="chip"
              aria-pressed={group === g.id}
              onClick={() => setGroup(group === g.id ? "all" : g.id)}
            >
              <span className={`map-dot map-dot-${g.id}`} aria-hidden="true" />
              {g.label}
            </button>
          ))}
        </FilterRow>
      </div>

      <div className="map-workspace">
        <div className="map-sidebar">
          <div className="map-sidebar-heading">
            <h2>Staðir á kortinu</h2>
            <span>{pinned.length}</span>
          </div>
          <div className="map-list">
            {pinned.map((place) => (
              <button
                key={place.id}
                type="button"
                className="map-list-item"
                aria-pressed={selected === place.id}
                onClick={() => focus(place)}
              >
                <PlaceSummary place={place} />
              </button>
            ))}
            {pinned.length === 0 && <p className="hint">Engir staðir á kortinu fyrir þetta val.</p>}

            {unpinned.length > 0 && (
              <>
                <p className="map-list-note">
                  Ekki á kortinu ({unpinned.length}): við vitum heimilisfangið en ekki hnitin. Smelltu til að opna
                  síðuna.
                </p>
                {unpinned.map((place) => (
                  <a
                    key={place.id}
                    className="map-list-item"
                    href={place.items[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PlaceSummary place={place} />
                  </a>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="map-canvas" ref={container} aria-label="Kort af Íslandi með stöðum" />
      </div>
    </>
  );
}

/** A place in the list: picture or pin, name, what is there, address. */
function PlaceSummary({ place }: { place: MapPlace }) {
  const [first] = place.items;
  const image = place.items.find((item) => item.imageUrl)?.imageUrl;
  return (
    <>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" />
      ) : (
        <span className="map-item-icon">
          <Icon name="pin" />
        </span>
      )}
      <span className="map-item-copy">
        <strong>
          <span className={`map-dot map-dot-${first.group}`} aria-hidden="true" />
          {place.name}
          {place.items.length === 1 && <AgePill item={first} />}
        </strong>
        <small>{whatIsThere(place)}</small>
        {place.address && <span>{place.address}</span>}
      </span>
    </>
  );
}

/** "Sundlaug · Útisundlaug 25×12 metrar", "Harpa: 12 viðburðir", "Happy hour · Kaldi Bar". */
function whatIsThere(place: MapPlace): string {
  const [first] = place.items;
  const label = MAP_GROUPS.find((g) => g.id === first.group)?.label ?? "";
  if (place.items.length === 1) {
    const parts = [first.title !== place.name ? first.title : label, first.detail];
    return parts.filter(Boolean).join(" · ");
  }
  const count = place.items.length;
  const groups = new Set(place.items.map((item) => item.group));
  if (groups.size === 1 && first.group === "vidburdir") return `${count} viðburðir · næst: ${first.title}`;
  if (groups.size === 1 && first.group === "bio") return `${count} myndir`;
  return `${count} atriði · ${place.items
    .slice(0, 2)
    .map((item) => item.title)
    .join(", ")}`;
}

/** The popup on a pin: the place and up to five things there, linked to their pages. */
function popupHtml(place: MapPlace): string {
  const shown = place.items.slice(0, 5);
  const rows = shown
    .map((item) => {
      const title = escapeHtml(item.title);
      // Only real web links are made clickable (the text comes from other websites).
      const link = /^https?:\/\//.test(item.url)
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${title}</a>`
        : `<b>${title}</b>`;
      return `<li>${link}${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</li>`;
    })
    .join("");
  const more = place.items.length > shown.length ? `<p class="map-popup-more">+${place.items.length - shown.length} í viðbót</p>` : "";
  const address = place.address ? `<br><span>${escapeHtml(place.address)}</span>` : "";
  return `<strong>${escapeHtml(place.name)}</strong>${address}<ul class="map-popup-list">${rows}</ul>${more}`;
}

/** Places with only the items that pass a test; places left with nothing are dropped. */
function keepItems(places: MapPlace[], test: (item: MapItem) => boolean): MapPlace[] {
  return places
    .map((place) => ({ ...place, items: place.items.filter(test) }))
    .filter((place) => place.items.length > 0);
}

const countItems = (places: MapPlace[]) => places.reduce((n, place) => n + place.items.length, 0);

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
