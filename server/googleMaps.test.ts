import { describe, it, expect } from "vitest";
import {
  generateGoogleMapsDirectionsUrl,
  formatLocationParam,
  lookupLocationCoordinates,
} from "../client/src/lib/googleMaps";

describe("Google Maps Route Redirection Suite", () => {
  it("formats coordinates directly when given coordinate object", () => {
    const formatted = formatLocationParam({ lat: 16.2970, lon: 80.4350 });
    expect(formatted).toBe("16.297000,80.435000");
  });

  it("resolves known agricultural mandi names to exact coordinates", () => {
    const mandiParam = formatLocationParam("Guntur Agricultural Market Yard");
    expect(mandiParam).toBe("16.297000,80.435000");

    const villageParam = formatLocationParam("Muppalapally");
    expect(villageParam).toBe("16.328500,80.354000");
  });

  it("URL-encodes unknown address strings safely", () => {
    const address = "Farm Gate #4, Near Canal Road, Tenali Rural";
    const formatted = formatLocationParam(address);
    expect(formatted).toBe(encodeURIComponent(address));
    expect(formatted).toContain("Farm%20Gate%20%234");
  });

  it("generates correct official Google Maps Universal Directions URL", () => {
    const result = generateGoogleMapsDirectionsUrl({
      origin: "Muppalapally",
      destination: "Guntur Agricultural Market Yard",
    });

    expect(result.success).toBe(true);
    expect(result.url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=16.328500,80.354000&destination=16.297000,80.435000&travelmode=driving"
    );
  });

  it("prefers explicit coordinates override when supplied", () => {
    const result = generateGoogleMapsDirectionsUrl({
      origin: "Muppalapally",
      destination: "Guntur Market Yard",
      originCoords: { lat: 16.3211, lon: 80.3499 },
      destinationCoords: { lat: 16.2988, lon: 80.4312 },
    });

    expect(result.success).toBe(true);
    expect(result.url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=16.321100,80.349900&destination=16.298800,80.431200&travelmode=driving"
    );
  });

  it("handles string with pre-formatted lat,lng coordinates", () => {
    const result = generateGoogleMapsDirectionsUrl({
      origin: "16.3285,80.3540",
      destination: "16.2970,80.4350",
    });

    expect(result.success).toBe(true);
    expect(result.url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=16.328500,80.354000&destination=16.297000,80.435000&travelmode=driving"
    );
  });

  it("returns clear descriptive error when origin is missing without generating invalid URL", () => {
    const result = generateGoogleMapsDirectionsUrl({
      origin: "",
      destination: "Guntur Agricultural Market Yard",
    });

    expect(result.success).toBe(false);
    expect(result.url).toBeNull();
    expect(result.error).toContain("Pickup location");
  });

  it("returns clear descriptive error when destination is missing without generating invalid URL", () => {
    const result = generateGoogleMapsDirectionsUrl({
      origin: "Muppalapally Village",
      destination: "",
    });

    expect(result.success).toBe(false);
    expect(result.url).toBeNull();
    expect(result.error).toContain("Destination mandi");
  });

  it("returns clear descriptive error when both are undefined", () => {
    const result = generateGoogleMapsDirectionsUrl({});

    expect(result.success).toBe(false);
    expect(result.url).toBeNull();
  });
});

