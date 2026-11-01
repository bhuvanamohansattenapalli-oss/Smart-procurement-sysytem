/**
 * ProcureFlow Logistics Road Route Map
 * Interactive Leaflet route map powered by Open-Meteo coordinates and OSRM road geometry.
 */

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, MapPin, Navigation, Clock, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/api";

export interface LogisticsRouteMapProps {
  originText?: string;
  destinationText?: string;
  origin?: string;
  destination?: string;
  vehicleType?: string;
  transportCode?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;
  height?: string | number;
  onRouteCalculated?: (distanceKm: number, durationMinutes: number) => void;
}

export const LogisticsRouteMap: React.FC<LogisticsRouteMapProps> = ({
  originText,
  destinationText,
  origin,
  destination,
  vehicleType = "Mini Truck",
  transportCode,
  driverName,
  driverPhone,
  vehicleNumber,
  originLat,
  originLon,
  destLat,
  destLon,
  height = "380px",
  onRouteCalculated,
}) => {
  const actualOrigin = origin || originText || "Tenali";
  const actualDestination = destination || destinationText || "Guntur";
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<{
    distanceKm: number;
    durationFormatted: string;
    durationMinutes: number;
    isRoadRoute: boolean;
    service: string;
    originName: string;
    destinationName: string;
  } | null>(null);

  const fetchAndRenderRoute = async () => {
    if (!mapContainerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (actualOrigin) params.set("origin", actualOrigin);
      if (actualDestination) params.set("destination", actualDestination);
      if (typeof originLat === "number") params.set("originLat", originLat.toString());
      if (typeof originLon === "number") params.set("originLon", originLon.toString());
      if (typeof destLat === "number") params.set("destLat", destLat.toString());
      if (typeof destLon === "number") params.set("destLon", destLon.toString());

      const res = await fetch(apiUrl(`/transport/route?${params.toString()}`));
      if (!res.ok) {
        throw new Error(`Failed to calculate road route (${res.status})`);
      }

      const json = await res.json();
      const route = json.route;
      if (!route || !route.geojsonGeometry) {
        throw new Error("No route geometry returned by routing engine.");
      }

      setRouteData({
        distanceKm: route.roadDistanceKm,
        durationFormatted: route.formattedDuration,
        durationMinutes: route.estimatedTravelTimeMinutes,
        isRoadRoute: route.isRoadRoute,
        service: route.routingService,
        originName: route.origin.name,
        destinationName: route.destination.name,
      });

      if (onRouteCalculated) {
        onRouteCalculated(route.roadDistanceKm, route.estimatedTravelTimeMinutes);
      }

      // Initialize map if not yet initialized
      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([route.origin.latitude, route.origin.longitude], 11);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | OSRM',
          maxZoom: 19,
        }).addTo(map);

        routeLayerGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const layerGroup = routeLayerGroupRef.current;

      if (map && layerGroup) {
        layerGroup.clearLayers();

        // 1. Origin Marker (Green Farm Pin)
        const originIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background: #176B4A; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const originMarker = L.marker([route.origin.latitude, route.origin.longitude], { icon: originIcon })
          .bindPopup(`<b>Farm Origin:</b><br/>${route.origin.name}`);
        layerGroup.addLayer(originMarker);

        // 2. Destination Marker (Amber Mandi Pin)
        const destIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background: #D97706; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const destMarker = L.marker([route.destination.latitude, route.destination.longitude], { icon: destIcon })
          .bindPopup(`<b>Procurement Mandi:</b><br/>${route.destination.name}`);
        layerGroup.addLayer(destMarker);

        // 3. Render Route Polyline (GeoJSON coordinates are [lon, lat], Leaflet expects [lat, lon])
        const latLngs: L.LatLngExpression[] = route.geojsonGeometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );

        if (route.isRoadRoute) {
          // Road route: Solid deep emerald polyline
          const polyline = L.polyline(latLngs, {
            color: "#176B4A",
            weight: 5,
            opacity: 0.85,
            lineJoin: "round",
          });
          layerGroup.addLayer(polyline);

          // Subtle casing outline for high contrast
          const polylineGlow = L.polyline(latLngs, {
            color: "#ffffff",
            weight: 8,
            opacity: 0.35,
          });
          layerGroup.addLayer(polylineGlow);
          polyline.bringToFront();

          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          // Fallback geodesic line: dashed orange
          const polyline = L.polyline(latLngs, {
            color: "#F59E0B",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.8,
          });
          layerGroup.addLayer(polyline);
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
      }
    } catch (err: any) {
      console.warn("[Logistics Map Error]", err?.message || err);
      setError(err?.message || "Could not calculate road route.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRenderRoute();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [actualOrigin, actualDestination, originLat, originLon, destLat, destLon]);

  return (
    <div className="logistics-route-widget flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Route Metadata Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                {transportCode || "Subsidized Logistics Route"}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold">
                {vehicleType}
              </span>
            </div>
            <div className="text-sm font-extrabold text-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{originText || "Farm Village"}</span>
              <span className="text-slate-400">→</span>
              <span>{destinationText || "Procurement Mandi"}</span>
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        {routeData && (
          <div className="flex items-center gap-4 text-xs font-bold shrink-0">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Navigation size={14} className="text-emerald-600" />
              <span>{routeData.distanceKm} km Road</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Clock size={14} className="text-amber-600" />
              <span>~{routeData.durationFormatted}</span>
            </div>
            <button
              onClick={fetchAndRenderRoute}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Refresh road route"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Map Viewport */}
      <div className="relative w-full" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-md text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <RefreshCw size={14} className="animate-spin text-emerald-600" />
              Calculating road route via OSRM…
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-3 left-3 right-3 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 p-2.5 rounded-xl flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 z-10 shadow-sm">
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>{error} Rendering radial distance estimate.</span>
          </div>
        )}
      </div>

      {/* Driver & Booking Footer */}
      {(driverName || vehicleNumber) && (
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between flex-wrap gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Driver: <b className="text-foreground">{driverName || "Mandi Assigned Driver"}</b></span>
            {driverPhone && <span className="text-slate-400">({driverPhone})</span>}
          </div>
          {vehicleNumber && (
            <div>Vehicle No: <b className="font-mono text-foreground">{vehicleNumber}</b></div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogisticsRouteMap;
