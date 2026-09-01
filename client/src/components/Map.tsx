/**
 * Real-time Interactive India-Wide Agricultural Procurement Map
 * Features:
 * - India-wide coverage with 56+ procurement centres across 14 major agricultural states
 * - Dual View Modes: [🗺️ Normal Map] & [🛰️ Satellite Map] with real Web-Mercator map tile layers
 * - Distance-based Marker Clustering when zoomed out (zoom <= 6)
 * - State and District quick filters with pan-to-state animations
 * - Search by centre name, city, or district
 * - 'Use My Location' GPS geolocation centering
 * - Detailed popup cards showing queue status, wait times, crop categories, and booking trigger
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
  Navigation,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type MapMode = "roadmap" | "satellite";

export interface CentreLocation {
  id: number;
  name: string;
  place: string;
  district?: string;
  state?: string;
  cropCategories?: string;
  address?: string;
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

// Default All-India Center (Geographical center near Nagpur / MP border)
const DEFAULT_INDIA_CENTER = { lat: 21.7679, lng: 78.8718 };
const TILE_SIZE = 256;

// State coordinates for instant pan
const STATE_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "All India": { lat: 21.7679, lng: 78.8718, zoom: 5 },
  "Andhra Pradesh": { lat: 16.2970, lng: 80.4350, zoom: 7 },
  "Telangana": { lat: 17.8495, lng: 79.1151, zoom: 7 },
  "Punjab": { lat: 30.9010, lng: 75.8573, zoom: 7 },
  "Haryana": { lat: 29.6857, lng: 76.9905, zoom: 7 },
  "Madhya Pradesh": { lat: 23.2599, lng: 77.4126, zoom: 7 },
  "Uttar Pradesh": { lat: 26.8467, lng: 80.9462, zoom: 7 },
  "Maharashtra": { lat: 19.7515, lng: 75.7139, zoom: 7 },
  "Karnataka": { lat: 15.3173, lng: 75.7139, zoom: 7 },
  "Tamil Nadu": { lat: 10.7905, lng: 78.7047, zoom: 7 },
  "Rajasthan": { lat: 26.9124, lng: 75.7873, zoom: 7 },
  "Gujarat": { lat: 22.2587, lng: 71.1924, zoom: 7 },
  "Bihar": { lat: 25.0961, lng: 85.3131, zoom: 7 },
  "Odisha": { lat: 20.9517, lng: 85.0985, zoom: 7 },
  "West Bengal": { lat: 23.2324, lng: 87.8615, zoom: 7 },
};

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

interface Cluster {
  id: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  count: number;
  centres: CentreLocation[];
  state?: string;
}

export function MapView({
  className,
  initialCenter = DEFAULT_INDIA_CENTER,
  initialZoom = 5,
  centres = [],
  selectedCentreId,
  onSelectCentre,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapMode, setMapMode] = useState<MapMode>("roadmap");
  const [activeCentre, setActiveCentre] = useState<CentreLocation | null>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [center, setCenter] = useState(initialCenter);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 520 });

  // Filtering controls inside map
  const [selectedState, setSelectedState] = useState<string>("All India");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Drag-to-pan interaction state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, centerWorldX: 0, centerWorldY: 0 });

  // Fallback centres if none passed
  const displayCentres: CentreLocation[] = useMemo(() => {
    if (centres && centres.length > 0) return centres;
    return [
      { id: 1, name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", district: "Guntur", state: "Andhra Pradesh", distance: "2.4 km", queue: 18, wait: "30 min", slots: 10, status: "Open", latitude: 16.2970, longitude: 80.4350 },
      { id: 2, name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", district: "NTR District", state: "Andhra Pradesh", distance: "4.8 km", queue: 8, wait: "15 min", slots: 14, status: "Open", latitude: 16.5417, longitude: 80.5847 },
      { id: 3, name: "Ludhiana Gill Road Grain Mandi", place: "Gill Road Grain Market", district: "Ludhiana", state: "Punjab", distance: "18.0 km", queue: 22, wait: "45 min", slots: 18, status: "Open", latitude: 30.9010, longitude: 75.8573 },
      { id: 4, name: "Karnal GT Road New Grain Market", place: "GT Road Dana Mandi", district: "Karnal", state: "Haryana", distance: "15.0 km", queue: 14, wait: "25 min", slots: 12, status: "Open", latitude: 29.6857, longitude: 76.9905 },
      { id: 5, name: "Nagpur Kalamna Grain Market", place: "Kalamna Market Yard", district: "Nagpur", state: "Maharashtra", distance: "12.0 km", queue: 19, wait: "35 min", slots: 15, status: "Open", latitude: 21.1719, longitude: 79.1364 },
    ];
  }, [centres]);

  // Available states for filter
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    displayCentres.forEach(c => {
      if (c.state) set.add(c.state);
    });
    return ["All India", ...Array.from(set).sort()];
  }, [displayCentres]);

  // Filtered centres based on state and search
  const filteredCentres = useMemo(() => {
    return displayCentres.filter(c => {
      const stateMatch = selectedState === "All India" || !c.state || c.state.toLowerCase() === selectedState.toLowerCase();
      const searchMatch = !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.state && c.state.toLowerCase().includes(searchQuery.toLowerCase()));
      return stateMatch && searchMatch;
    });
  }, [displayCentres, selectedState, searchQuery]);

  // Sync selected centre
  useEffect(() => {
    if (selectedCentreId) {
      const match = displayCentres.find(c => c.id === selectedCentreId);
      if (match) {
        setActiveCentre(match);
        if (match.latitude && match.longitude) {
          setCenter({ lat: match.latitude, lng: match.longitude });
          if (zoom < 7) setZoom(8);
        }
      }
    }
  }, [selectedCentreId, displayCentres]);

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

  // Convert lat/lng to screen pixel position in the viewport
  const getScreenPixel = useCallback((lat?: number, lng?: number) => {
    if (!lat || !lng) return { x: -999, y: -999 };
    const markerWorldX = lon2x(lng, zoom);
    const markerWorldY = lat2y(lat, zoom);

    const screenX = markerWorldX - centerWorld.x + viewportSize.width / 2;
    const screenY = markerWorldY - centerWorld.y + viewportSize.height / 2;
    return { x: screenX, y: screenY };
  }, [centerWorld, viewportSize, zoom]);

  // Marker clustering algorithm when zoom <= 6
  const { clusters, unclustered } = useMemo(() => {
    if (zoom > 6) {
      return { clusters: [], unclustered: filteredCentres };
    }

    const clusterList: Cluster[] = [];
    const unclusteredList: CentreLocation[] = [];
    const clusterPixelRadius = 65;

    for (const centre of filteredCentres) {
      if (!centre.latitude || !centre.longitude) continue;
      const pixel = getScreenPixel(centre.latitude, centre.longitude);
      if (pixel.x < -100 || pixel.x > viewportSize.width + 100 || pixel.y < -100 || pixel.y > viewportSize.height + 100) {
        continue;
      }

      // Find nearby cluster
      let found = false;
      for (let i = 0; i < clusterList.length; i++) {
        const cluster = clusterList[i];
        const dx = pixel.x - cluster.x;
        const dy = pixel.y - cluster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < clusterPixelRadius) {
          cluster.count++;
          cluster.centres.push(centre);
          found = true;
          break;
        }
      }

      if (!found) {
        clusterList.push({
          id: "cluster-" + centre.id,
          x: pixel.x,
          y: pixel.y,
          lat: centre.latitude,
          lng: centre.longitude,
          count: 1,
          centres: [centre],
          state: centre.state,
        });
      }
    }

    const clusterArr: Cluster[] = [];
    for (let i = 0; i < clusterList.length; i++) {
      const c = clusterList[i];
      if (c.count > 1) {
        clusterArr.push(c);
      } else {
        unclusteredList.push(c.centres[0]);
      }
    }

    return { clusters: clusterArr, unclustered: unclusteredList };
  }, [filteredCentres, zoom, getScreenPixel, viewportSize]);

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
          tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + zoom + "/" + ty + "/" + wrappedX;
        } else {
          tileUrl = "https://tile.openstreetmap.org/" + zoom + "/" + wrappedX + "/" + ty + ".png";
        }

        const tileLeft = tx * TILE_SIZE - centerWorld.x + halfW;
        const tileTop = ty * TILE_SIZE - centerWorld.y + halfH;

        tiles.push({
          key: zoom + "-" + tx + "-" + ty + "-" + mapMode,
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

    // Keep centered within India geographic envelope (6.5 N to 38.0 N, 66.0 E to 98.0 E)
    if (newLat >= 6 && newLat <= 38 && newLng >= 66 && newLng <= 98) {
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
        setZoom(z => Math.min(z + 1, 14));
      } else if (e.deltaY > 0) {
        setZoom(z => Math.max(z - 1, 4));
      }
    },
    []
  );

  const handleZoomIn = () => setZoom(z => Math.min(z + 1, 14));
  const handleZoomOut = () => setZoom(z => Math.max(z - 1, 4));

  const handleFitIndia = () => {
    setSelectedState("All India");
    setCenter(DEFAULT_INDIA_CENTER);
    setZoom(5);
  };

  const handleStateSelect = (stateName: string) => {
    setSelectedState(stateName);
    const target = STATE_CENTERS[stateName];
    if (target) {
      setCenter({ lat: target.lat, lng: target.lng });
      setZoom(target.zoom);
    } else {
      const match = displayCentres.find(c => c.state?.toLowerCase() === stateName.toLowerCase());
      if (match && match.latitude && match.longitude) {
        setCenter({ lat: match.latitude, lng: match.longitude });
        setZoom(7);
      }
    }
  };

  // Geolocation trigger
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setCenter({ lat: userLat, lng: userLng });
        setZoom(8);

        // Find closest centre
        let closest = displayCentres[0];
        let minDist = Infinity;
        for (const c of displayCentres) {
          if (c.latitude && c.longitude) {
            const dist = Math.hypot(c.latitude - userLat, c.longitude - userLng);
            if (dist < minDist) {
              minDist = dist;
              closest = c;
            }
          }
        }
        if (closest) {
          setActiveCentre(closest);
          if (onSelectCentre) onSelectCentre(closest);
        }
      },
      err => {
        console.warn("Geolocation failed:", err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
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
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : "h-[560px]",
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
              left: tile.left + "px",
              top: tile.top + "px",
            }}
            onError={e => {
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

      {/* 2. TOP TOOLBAR: State Selector, Search, GPS, Mode Toggle, Fullscreen */}
      <div
        className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 p-2 bg-white/95 backdrop-blur-md rounded-xl border border-emerald-900/15 shadow-md"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* State Filter Dropdown */}
          <select
            value={selectedState}
            onChange={e => handleStateSelect(e.target.value)}
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
          >
            {availableStates.map(st => (
              <option key={st} value={st}>
                {st === "All India" ? "🇮🇳 All India (" + displayCentres.length + " Centres)" : st}
              </option>
            ))}
          </select>

          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search centre, district..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg w-44 focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>

          {/* DUAL VIEW BUTTONS: Normal Map vs Satellite Map */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMapMode("roadmap")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                mapMode === "roadmap"
                  ? "bg-white text-[#154631] shadow-xs font-extrabold border border-emerald-300"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Globe2 size={13} className={mapMode === "roadmap" ? "text-emerald-700" : ""} />
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapMode("satellite")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                mapMode === "satellite"
                  ? "bg-[#143d2c] text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Layers size={13} className={mapMode === "satellite" ? "text-emerald-300" : ""} />
              Satellite
            </button>
          </div>
        </div>

        {/* Action Controls: Use GPS, Fit India, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUseMyLocation}
            title="Use my current GPS location"
            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Navigation size={12} className="text-emerald-700" />
            <span className="hidden sm:inline">My Location</span>
          </button>
          <button
            type="button"
            onClick={handleFitIndia}
            title="Reset to All-India View"
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">All India</span>
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

      {/* 3. MARKER PINS & CLUSTERS LAYER */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Render Clusters when zoomed out */}
        {clusters.map(cluster => {
          const pixel = { x: cluster.x, y: cluster.y };
          return (
            <div
              key={cluster.id}
              style={{ left: pixel.x + "px", top: pixel.y + "px" }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => {
                setCenter({ lat: cluster.lat, lng: cluster.lng });
                setZoom(z => Math.min(z + 2, 8));
              }}
            >
              {/* Cluster animated ripple */}
              <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />

              {/* Cluster circle badge */}
              <div className="relative flex flex-col items-center justify-center w-11 h-11 rounded-full bg-emerald-800 text-white font-extrabold shadow-lg border-2 border-white group-hover:scale-115 transition-transform">
                <span className="text-sm leading-none">{cluster.count}</span>
                <span className="text-[8px] uppercase tracking-tighter text-emerald-200">Centres</span>
              </div>

              {/* Cluster State Label */}
              {cluster.state && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold whitespace-nowrap shadow-xs pointer-events-none">
                  {cluster.state}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Individual Centre Pins */}
        {(zoom > 6 ? filteredCentres : unclustered).map(centre => {
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
              style={{ left: pixel.x + "px", top: pixel.y + "px" }}
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

      {/* 5. MAP LEGEND & DATA TRANSPARENCY NOTICE */}
      <div
        className="absolute left-3 bottom-3 z-30 hidden sm:flex flex-col gap-1.5"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Open ({filteredCentres.filter(c => c.status === "Open").length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Limited ({filteredCentres.filter(c => c.status === "Limited").length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Busy ({filteredCentres.filter(c => c.status === "Busy").length})
          </span>
          {clusters.length > 0 && (
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              • Zoom in to expand {clusters.length} regional clusters
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 px-1 font-medium">
          ProcureFlow National Network · Application Dataset · API Ready
        </span>
      </div>

      {/* 6. POPUP CARD / SELECTED CENTRE DETAIL */}
      {activeCentre && (
        <div
          className="absolute right-3 bottom-3 left-auto max-w-[350px] z-30 p-3.5 bg-white/95 backdrop-blur-md rounded-xl border border-emerald-300 shadow-xl animate-in fade-in slide-in-from-bottom-2"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                {activeCentre.state ?? "State"} · {activeCentre.district ?? "District"}
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

          <p className="text-[11px] text-slate-600 mb-1.5">
            📍 {activeCentre.place}
          </p>

          {activeCentre.cropCategories && (
            <p className="text-[10px] text-emerald-900 font-semibold bg-emerald-50 px-2 py-0.5 rounded mb-2 border border-emerald-200">
              🌾 Crops: {activeCentre.cropCategories}
            </p>
          )}

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
                href={"https://www.google.com/maps/dir/?api=1&destination=" + activeCentre.latitude + "," + activeCentre.longitude}
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
