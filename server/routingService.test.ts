import { describe, it, expect } from "vitest";
import {
  calculateOsrmRoadRoute,
  resolveLocationCoordinates,
  KNOWN_LOGISTICS_COORDINATES,
} from "./services/routingService";

describe("OSRM Logistics & Road Routing Service Suite", () => {
  it("resolves known village and mandi coordinates accurately", () => {
    const muppalapally = resolveLocationCoordinates("Muppalapally");
    expect(muppalapally.lat).toBeCloseTo(16.3285, 2);
    expect(muppalapally.lon).toBeCloseTo(80.3540, 2);

    const gunturMandi = resolveLocationCoordinates("Guntur Agricultural Market Yard");
    expect(gunturMandi.lat).toBeCloseTo(16.3067, 2);
    expect(gunturMandi.lon).toBeCloseTo(80.4365, 2);
  });

  it("calculates real road route with GeoJSON geometry from OSRM", async () => {
    const route = await calculateOsrmRoadRoute({
      originText: "Muppalapally",
      destinationText: "Guntur Agricultural Market Yard",
    });

    expect(route).toBeDefined();
    expect(route.roadDistanceKm).toBeGreaterThan(0);
    expect(route.estimatedTravelTimeMinutes).toBeGreaterThan(0);
    expect(route.geojsonGeometry).toBeDefined();
    expect(route.geojsonGeometry.type).toBe("LineString");
    expect(route.geojsonGeometry.coordinates.length).toBeGreaterThan(1);
    expect(route.attribution).toContain("OpenStreetMap");
  });

  it("handles coordinate input directly and returns turn-by-turn guidance", async () => {
    const route = await calculateOsrmRoadRoute({
      originLat: 16.2437,
      originLon: 80.6400, // Tenali
      destLat: 16.3067,
      destLon: 80.4365, // Guntur
    });

    expect(route.roadDistanceKm).toBeGreaterThan(10);
    expect(route.roadDistanceKm).toBeLessThan(45);
    expect(route.isRoadRoute).toBe(true);
  });
});
