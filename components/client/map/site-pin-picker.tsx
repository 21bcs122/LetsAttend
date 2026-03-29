"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Maximize2, X } from "lucide-react";
import {
  BasemapLayerControl,
  BasemapTileLayer,
} from "@/components/client/map/basemap-layer-control";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/map/tile-layers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SitePinChrome = "admin" | "sheet";

const markerIconUrl = new URL(
  "leaflet/dist/images/marker-icon.png",
  import.meta.url
).toString();
const markerIcon2xUrl = new URL(
  "leaflet/dist/images/marker-icon-2x.png",
  import.meta.url
).toString();
const markerShadowUrl = new URL(
  "leaflet/dist/images/marker-shadow.png",
  import.meta.url
).toString();

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

export type LatLng = { latitude: number; longitude: number };

function ClickToPick({
  onPick,
}: {
  onPick: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

function FlyTo({ target, seq }: { target: LatLng | null; seq: number }) {
  const map = useMap();
  React.useEffect(() => {
    if (!target) return;
    map.setView([target.latitude, target.longitude], 16);
  }, [map, target, seq]);
  return null;
}

function InvalidateSizeOn({ when }: { when: unknown }) {
  const map = useMap();
  React.useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map, when]);
  return null;
}

function cssHeight(h: number | string) {
  return typeof h === "number" ? `${h}px` : h;
}

function SitePinMapBody({
  value,
  onChange,
  defaultToUserLocation,
  height,
  recenterAt,
  recenterSeq,
  resizeSignal,
  mapChrome,
}: {
  value: LatLng | null;
  onChange: (latlng: LatLng) => void;
  defaultToUserLocation?: boolean;
  height: number | string;
  recenterAt?: LatLng | null;
  recenterSeq?: number;
  resizeSignal?: unknown;
  mapChrome: SitePinChrome;
}) {
  const [basemap, setBasemap] = React.useState<BasemapId>(DEFAULT_BASEMAP);
  const [center, setCenter] = React.useState<LatLng>({
    latitude: value?.latitude ?? 0,
    longitude: value?.longitude ?? 0,
  });

  React.useEffect(() => {
    if (value) setCenter(value);
  }, [value]);

  React.useEffect(() => {
    if (!defaultToUserLocation) return;
    if (value) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [defaultToUserLocation, value]);

  const lat = value?.latitude ?? center.latitude;
  const lng = value?.longitude ?? center.longitude;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        mapChrome === "sheet"
          ? "border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/50"
          : "border border-white/10 bg-black/20"
      )}
    >
      <div style={{ height: cssHeight(height) }}>
        <MapContainer
          center={[lat, lng]}
          zoom={value ? 14 : 2}
          className="h-full w-full"
          scrollWheelZoom
        >
          {resizeSignal !== undefined ? (
            <InvalidateSizeOn when={resizeSignal} />
          ) : null}
          <BasemapTileLayer basemap={basemap} />
          <BasemapLayerControl
            value={basemap}
            onChange={setBasemap}
            tone={mapChrome === "sheet" ? "light" : "dark"}
          />
          <FlyTo target={recenterAt ?? null} seq={recenterSeq ?? 0} />
          <ClickToPick onPick={onChange} />
          {value ? (
            <Marker
              position={[value.latitude, value.longitude]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  onChange({ latitude: ll.lat, longitude: ll.lng });
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}

export function SitePinPicker({
  value,
  onChange,
  defaultToUserLocation = true,
  height = 360,
  recenterAt,
  recenterSeq = 0,
  enableFullscreen = false,
  /** `sheet` = light/dark-aware frame (employee custom site modal). */
  mapChrome = "admin",
}: {
  value: LatLng | null;
  onChange: (latlng: LatLng) => void;
  defaultToUserLocation?: boolean;
  height?: number | string;
  /** Pan map to these coordinates (e.g. after place search). */
  recenterAt?: LatLng | null;
  /** Bump when re-searching the same coords so the map pans again. */
  recenterSeq?: number;
  /** Open a full-viewport map for precise pin placement. */
  enableFullscreen?: boolean;
  mapChrome?: SitePinChrome;
}) {
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const inlineH = height;
  const fsH = "calc(100dvh - 120px)";

  const mapBlock = (
    <SitePinMapBody
      value={value}
      onChange={onChange}
      defaultToUserLocation={defaultToUserLocation}
      height={fullscreen ? fsH : inlineH}
      recenterAt={recenterAt}
      recenterSeq={recenterSeq}
      resizeSignal={fullscreen}
      mapChrome={mapChrome}
    />
  );

  const fsBtnCls =
    mapChrome === "sheet"
      ? "gap-1.5 border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      : "gap-1.5";

  const fullscreenEntry =
    enableFullscreen && !fullscreen ? (
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={fsBtnCls}
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="size-4" />
          Fullscreen map
        </Button>
      </div>
    ) : null;

  if (fullscreen && enableFullscreen && typeof document !== "undefined") {
    return createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[8500] flex flex-col p-4 backdrop-blur-sm",
          mapChrome === "sheet"
            ? "bg-white/98 dark:bg-zinc-950/98"
            : "bg-zinc-950/98"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Place site pin"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                mapChrome === "sheet"
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-100"
              )}
            >
              Place site pin
            </p>
            <p
              className={cn(
                "mt-1 text-xs",
                mapChrome === "sheet"
                  ? "text-zinc-600 dark:text-zinc-400"
                  : "text-zinc-500"
              )}
            >
              Click or drag the marker. Use Satellite for an overhead view.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={fsBtnCls}
            onClick={() => setFullscreen(false)}
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1">{mapBlock}</div>
      </div>,
      document.body
    );
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          "mb-3 text-sm",
          mapChrome === "sheet"
            ? "text-zinc-600 dark:text-zinc-400 [&_strong]:font-semibold [&_strong]:text-zinc-800 dark:[&_strong]:text-zinc-200"
            : "text-zinc-300"
        )}
      >
        Click the map to place the pin, or drag the pin. Use <strong>Satellite</strong> for an
        overhead view of the workplace.
      </div>
      {fullscreenEntry}
      {mapBlock}
    </div>
  );
}
