/**
 * Real-time Interactive Andhra Pradesh Agricultural Procurement Map
 * Features:
 * - Dual View Modes: [🗺️ Normal Map] & [🛰️ Satellite Map] with real map tile layers
 * - Interactive Drag-to-Pan & Mouse Wheel / Touch Zooming
 * - Real geographical Web-Mercator coordinate projections
 * - Custom pins with live queue badges (Open, Limited, Busy) for all AP centres
 * - Popup info card with queue count, wait time, and one-click selection
 * - Google Maps directions link
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Layers,
  Globe2,
  Maximize2,
  UsersRound,
  Clock3,
  ArrowRight,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    google?: any;
  }
}

export type MapMode = "roadmap" | "satellite";

export interface CentreLocation {
  id: number;
  name: string;
  place: string;
  district?: string;
  distance?: string;
  queue: number;
  wait: string;
  slots: number;
  status: "Open" | "Busy" | "Limited" | string;
  latitude?: number;
  longitude?: number;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  centres?: CentreLocation[];
  selectedCentreId?: number;
  onSelectCentre?: (centre: CentreLocation) => void;
  onMapReady?: (map: any) => void;
}

// Default Andhra Pradesh Center (Guntur / Amaravati / Vijayawada)
const DEFAULT_AP_CENTER = { lat: 16.2970, lng: 80.4350 };
const TILE_SIZE = 256;

// Mercator Projection Helper functions
function lon2x(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
}

function lat2y(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.min(Math.max(sin, -0.9999), 0.9999);
  return (
    (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) *
    Math.pow(2, zoom) *
    TILE_SIZE
  );
}

function x2lon(x: number, zoom: number): number {
  return (x / (Math.pow(2, zoom) * TILE_SIZE)) * 360 - 180;
}

function y2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, zoom) * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function MapView({
  className,
  initialCenter = DEFAULT_AP_CENTER,
  initialZoom = 8,
  centres = [],
  selectedCentreId,
  onSelectCentre,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapMode, setMapMode] = useState<MapMode>("roadmap");
  const [activeCentre, setActiveCentre] = useState<CentreLocation | null>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [center, setCenter] = useState(initialCenter);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 520 });

  // Drag-to-pan interaction state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, centerWorldX: 0, centerWorldY: 0 });

  // Default Andhra Pradesh Procurement Centres
  const apCentres: CentreLocation[] = useMemo(() => {
    if (centres && centres.length > 0) return centres;
    return [
      { id: 1, name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", district: "Guntur", distance: "2.4 km", queue: 18, wait: "30 min", slots: 10, status: "Open", latitude: 16.2970, longitude: 80.4350 },
      { id: 2, name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", district: "NTR District", distance: "4.8 km", queue: 8, wait: "15 min", slots: 14, status: "Open", latitude: 16.5417, longitude: 80.5847 },
      { id: 3, name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", district: "Kurnool", distance: "6.5 km", queue: 28, wait: "50 min", slots: 4, status: "Busy", latitude: 15.8281, longitude: 78.0373 },
      { id: 4, name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", district: "East Godavari", distance: "8.2 km", queue: 12, wait: "25 min", slots: 8, status: "Limited", latitude: 17.0005, longitude: 81.8040 },
      { id: 5, name: "Eluru District Procurement Yard", place: "Sanivarapupeta", district: "Eluru", distance: "10.5 km", queue: 6, wait: "10 min", slots: 16, status: "Open", latitude: 16.7107, longitude: 81.0952 },
      { id: 6, name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", district: "Nellore", distance: "13.8 km", queue: 15, wait: "30 min", slots: 7, status: "Open", latitude: 14.4426, longitude: 79.9865 },
      { id: 7, name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", district: "Tirupati", distance: "15.2 km", queue: 32, wait: "55 min", slots: 3, status: "Busy", latitude: 13.6288, longitude: 79.4192 },
      { id: 8, name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", district: "Visakhapatnam", distance: "18.5 km", queue: 9, wait: "20 min", slots: 12, status: "Open", latitude: 17.8864, longitude: 83.3980 },
    ];
  }, [centres]);

  // Sync selected centre
  useEffect(() => {
    if (selectedCentreId) {
      const match = apCentres.find(c => c.id === selectedCentreId);
      if (match) {
        setActiveCentre(match);
        if (match.latitude && match.longitude) {
          setCenter({ lat: match.latitude, lng: match.longitude });
        }
      }
    } else if (!activeCentre && apCentres.length > 0) {
      setActiveCentre(apCentres[0]);
    }
  }, [selectedCentreId, apCentres]);

  // Track container dimensions for tile math
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isFullscreen]);

  // Compute center world pixel
  const centerWorld = useMemo(() => {
    return {
      x: lon2x(center.lng, zoom),
      y: lat2y(center.lat, zoom),
    };
  }, [center, zoom]);

  // Generate tiles grid covering current viewport
  const visibleTiles = useMemo(() => {
    const halfW = viewportSize.width / 2;
    const halfH = viewportSize.height / 2;

    const minWorldX = centerWorld.x - halfW;
    const maxWorldX = centerWorld.x + halfW;
    const minWorldY = centerWorld.y - halfH;
    const maxWorldY = centerWorld.y + halfH;

    const minTileX = Math.floor(minWorldX / TILE_SIZE);
    const maxTileX = Math.floor(maxWorldX / TILE_SIZE);
    const minTileY = Math.floor(minWorldY / TILE_SIZE);
    const maxTileY = Math.floor(maxWorldY / TILE_SIZE);

    const tiles: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
      size: number;
    }> = [];

    const maxCoord = Math.pow(2, zoom);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedX = ((tx % maxCoord) + maxCoord) % maxCoord;
        if (ty < 0 || ty >= maxCoord) continue;

        let tileUrl = "";
        if (mapMode === "satellite") {
          // Esri World Imagery (High Resolution Global Satellite Tiles)
          tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${wrappedX}`;
        } else {
          // OpenStreetMap standard road tile layer
          tileUrl = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`;
        }

        const tileLeft = tx * TILE_SIZE - centerWorld.x + halfW;
        const tileTop = ty * TILE_SIZE - centerWorld.y + halfH;

        tiles.push({
          key: `${zoom}-${tx}-${ty}-${mapMode}`,
          url: tileUrl,
          left: tileLeft,
          top: tileTop,
          size: TILE_SIZE,
        });
      }
    }
    return tiles;
  }, [centerWorld, viewportSize, zoom, mapMode]);

  // Mouse / Touch Pan Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      centerWorldX: centerWorld.x,
      centerWorldY: centerWorld.y,
    };
    if (containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const newWorldX = dragStart.current.centerWorldX - dx;
    const newWorldY = dragStart.current.centerWorldY - dy;

    const newLng = x2lon(newWorldX, zoom);
    const newLat = y2lat(newWorldY, zoom);

    // Keep centered in South India / Andhra Pradesh
    if (newLat >= 10 && newLat <= 24 && newLng >= 72 && newLng <= 88) {
      setCenter({ lat: newLat, lng: newLng });
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(z => Math.min(z + 1, 13));
      } else if (e.deltaY > 0) {
        setZoom(z => Math.max(z - 1, 7));
      }
    },
    []
  );

  const handleZoomIn = () => setZoom(z => Math.min(z + 1, 13));
  const handleZoomOut = () => setZoom(z => Math.max(z - 1, 7));

  const handleFitAP = () => {
    setCenter(DEFAULT_AP_CENTER);
    setZoom(8);
  };

  // Convert lat/lng to screen pixel position in the viewport
  const getScreenPixel = (lat?: number, lng?: number) => {
    if (!lat || !lng) return { x: -999, y: -999 };
    const markerWorldX = lon2x(lng, zoom);
    const markerWorldY = lat2y(lat, zoom);

    const screenX = markerWorldX - centerWorld.x + viewportSize.width / 2;
    const screenY = markerWorldY - centerWorld.y + viewportSize.height / 2;
    return { x: screenX, y: screenY };
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      className={cn(
        "relative w-full rounded-2xl overflow-hidden border border-[#c4d8cc] shadow-md bg-[#e4ede7] select-none cursor-grab touch-none",
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : "h-[540px]",
        className
      )}
    >
      {/* 1. MAP TILES CANVAS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {visibleTiles.map(tile => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="eager"
            className={cn(
              "absolute w-[256px] h-[256px] transition-opacity duration-200",
              mapMode === "satellite" ? "filter brightness-95 contrast-105" : "filter saturate-105"
            )}
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
            }}
            onError={e => {
              // Graceful fallback for single network drops
              (e.target as HTMLImageElement).style.opacity = "0.4";
            }}
          />
        ))}

        {/* Ambient Map Tint Overlay */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            mapMode === "satellite"
              ? "bg-emerald-950/20 mix-blend-multiply"
              : "bg-emerald-900/5 mix-blend-color"
          )}
        />
      </div>

      {/* 2. TOP TOOLBAR: View Switcher (Normal Map / Satellite Map) & District Badge */}
      <div
        className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 p-2 bg-white/95 backdrop-blur-md rounded-xl border border-emerald-900/15 shadow-md"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-900 border-emerald-300 font-bold px-2.5 py-1 text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse mr-1.5 inline-block" />
            Andhra Pradesh Network
          </Badge>

          {/* DUAL VIEW BUTTONS: Normal Map vs Satellite Map */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMapMode("roadmap")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                mapMode === "roadmap"
                  ? "bg-white text-[#154631] shadow-xs font-extrabold border border-emerald-300"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Globe2 size={13} className={mapMode === "roadmap" ? "text-emerald-700" : ""} />
              Normal Map
            </button>
            <button
              type="button"
              onClick={() => setMapMode("satellite")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                mapMode === "satellite"
                  ? "bg-[#143d2c] text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Layers size={13} className={mapMode === "satellite" ? "text-emerald-300" : ""} />
              Satellite Map
            </button>
          </div>
        </div>

        {/* Action Controls: Fit AP, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFitAP}
            title="Recenter Andhra Pradesh"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Fit AP</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(f => !f)}
            title="Toggle fullscreen map"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs shadow-2xs cursor-pointer"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* 3. MARKER PINS LAYER (Accurate Geographic Coordinate Mapping) */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {apCentres.map(centre => {
          const pixel = getScreenPixel(centre.latitude, centre.longitude);
          if (pixel.x < -100 || pixel.x > viewportSize.width + 100 || pixel.y < -100 || pixel.y > viewportSize.height + 100) {
            return null;
          }

          const isSelected = (activeCentre?.id === centre.id) || (selectedCentreId === centre.id);
          const statusBg =
            centre.status === "Open"
              ? "bg-emerald-600"
              : centre.status === "Busy"
              ? "bg-rose-600"
              : "bg-amber-500";

          return (
            <div
              key={centre.id}
              style={{ left: `${pixel.x}px`, top: `${pixel.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => {
                setActiveCentre(centre);
                if (centre.latitude && centre.longitude) {
                  setCenter({ lat: centre.latitude, lng: centre.longitude });
                }
                if (onSelectCentre) onSelectCentre(centre);
              }}
            >
              {/* Selected Centre Animated Halo */}
              {isSelected && (
                <span className="absolute -inset-3 rounded-full bg-emerald-400/50 animate-ping pointer-events-none" />
              )}

              {/* Pin Icon */}
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full shadow-lg border-2 border-white transition-all transform group-hover:scale-125 text-white",
                  statusBg,
                  isSelected ? "w-10 h-10 ring-4 ring-emerald-500/50 scale-110" : "w-8 h-8"
                )}
              >
                <MapPin size={isSelected ? 20 : 16} className="fill-current" />
              </div>

              {/* Floating Town Label */}
              <div
                className={cn(
                  "absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md whitespace-nowrap text-[10px] font-bold shadow-md transition-opacity pointer-events-none",
                  isSelected
                    ? "bg-[#143d2c] text-white opacity-100 ring-1 ring-white/30 z-30"
                    : mapMode === "satellite"
                    ? "bg-black/80 text-emerald-200 opacity-90 group-hover:opacity-100"
                    : "bg-white text-slate-900 opacity-90 group-hover:opacity-100 border border-slate-200"
                )}
              >
                {centre.name.split(" ")[0]} ({centre.district ?? centre.place.split(",")[0]})
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. ZOOM CONTROLS */}
      <div
        className="absolute right-3 top-20 z-30 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl p-1 border border-slate-200 shadow-md"
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
        >
          <ZoomIn size={15} />
        </button>
        <div className="h-px bg-slate-200 my-0.5" />
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
        >
          <ZoomOut size={15} />
        </button>
      </div>

      {/* 5. MAP LEGEND */}
      <div
        className="absolute left-3 bottom-3 z-30 hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm text-[11px] font-semibold text-slate-700"
        onPointerDown={e => e.stopPropagation()}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Open ({apCentres.filter(c => c.status === "Open").length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Limited ({apCentres.filter(c => c.status === "Limited").length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Busy ({apCentres.filter(c => c.status === "Busy").length})
        </span>
      </div>

      {/* 6. POPUP CARD / SELECTED CENTRE DETAIL */}
      {activeCentre && (
        <div
          className="absolute right-3 bottom-3 left-auto max-w-[340px] z-30 p-3.5 bg-white/95 backdrop-blur-md rounded-xl border border-emerald-300 shadow-xl animate-in fade-in slide-in-from-bottom-2"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                {activeCentre.district ?? "Andhra Pradesh"} · {activeCentre.distance ?? "2.4 km away"}
              </span>
              <h4 className="text-xs font-bold text-slate-900 leading-snug m-0">
                {activeCentre.name}
              </h4>
            </div>
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0 font-bold",
                activeCentre.status === "Open"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : activeCentre.status === "Busy"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              )}
            >
              {activeCentre.status}
            </Badge>
          </div>

          <p className="text-[11px] text-slate-600 mb-2">
            📍 {activeCentre.place}
          </p>

          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-700 font-semibold mb-2.5 border border-slate-100">
            <div className="flex items-center gap-1">
              <UsersRound size={12} className="text-emerald-700" />
              <span><b>{activeCentre.queue}</b> in queue</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock3 size={12} className="text-emerald-700" />
              <span><b>{activeCentre.wait}</b> wait</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer"
              onClick={() => {
                if (onSelectCentre) onSelectCentre(activeCentre);
              }}
            >
              Select this Centre <ArrowRight size={12} className="ml-1" />
            </Button>
            {activeCentre.latitude && activeCentre.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeCentre.latitude},${activeCentre.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 text-[11px] font-semibold"
                title="Directions in Google Maps"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


