"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, Tooltip, CircleMarker } from "react-leaflet";

import { formatDistance, formatPrice, getVisibleCoverage, pluralize } from "@/lib/dashboard";
import type { DashboardPayload, MapSidebarItemModel } from "@/lib/types";

const iconRetinaUrl = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const iconUrl = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const shadowUrl = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

function TileThemeSync({ theme }: { theme: "dark" | "light" }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}

export function MapPanel({
  payload,
  visibleDispensaries,
  theme,
  selectedDispensary,
  onSelect,
  offline,
}: {
  payload: DashboardPayload;
  visibleDispensaries: MapSidebarItemModel[];
  theme: "dark" | "light";
  selectedDispensary: string;
  onSelect: (name: string) => void;
  offline: boolean;
}) {
  const center: [number, number] = [payload.data.centerLat || 38.9283, payload.data.centerLng || -104.7949];
  const radius = (payload.data.radius || 30) * 1609.34;
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className="map-surface">
      <MapContainer center={center} zoom={11} className="map-container" scrollWheelZoom>
        <TileThemeSync theme={theme} />
        {!offline ? <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' subdomains="abcd" maxZoom={19} url={tileUrl} /> : null}
        <Circle center={center} radius={radius} pathOptions={{ color: "#00c853", fillOpacity: 0.03, weight: 1 }} />
        {visibleDispensaries
          .filter((item) => item.dispensary.lat != null && item.dispensary.lng != null)
          .map((item) => {
            const dispensary = item.dispensary;
            const coverage = getVisibleCoverage(dispensary.products);
            const isSelected = selectedDispensary === dispensary.name;
            return (
              <CircleMarker
                key={dispensary.name}
                center={[dispensary.lat as number, dispensary.lng as number]}
                radius={isSelected ? 14 : Math.max(7, Math.min(14, 5 + dispensary.uniqueStrainCount))}
                pathOptions={{ color: "#00c853", fillColor: "#00c853", fillOpacity: isSelected ? 0.9 : 0.65, weight: isSelected ? 3 : 2 }}
                eventHandlers={{ click: () => onSelect(dispensary.name) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <div className="map-tooltip">
                    <strong>{dispensary.name}</strong>
                    <div>{formatDistance(dispensary.distance)} · {pluralize(dispensary.productCount, "listing")}</div>
                    <div>{dispensary.minPrice != null ? `from ${formatPrice(dispensary.minPrice)}` : "No price"} · {coverage}% priced</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
      {offline ? (
        <div className="map-offline-overlay">
          Map tiles are unavailable offline. The ranked destination list remains active.
        </div>
      ) : null}
    </div>
  );
}
