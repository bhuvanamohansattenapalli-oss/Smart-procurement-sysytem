/**
 * Google Maps Route Redirection Service
 * Generates official Google Maps Universal Directions URLs for logistics trips.
 * Supports exact coordinate resolution and properly URL-encoded address strings.
 * Requires NO API key for external redirection.
 */

export interface LocationCoordinate {
  lat: number;
  lon?: number;
  lng?: number;
}

// Coordinate registry for Rythu Bharosa Kendras, APMC Mandis, and rural farming hubs
export const LOGISTICS_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  // Mandis & Procurement Centres
  "guntur agricultural market yard": { lat: 16.2970, lon: 80.4350, name: "Guntur Agricultural Market Yard" },
  "guntur market yard": { lat: 16.2970, lon: 80.4350, name: "Guntur Agricultural Market Yard" },
  "guntur": { lat: 16.2970, lon: 80.4350, name: "Guntur Agricultural Market Yard" },
  "vijayawada central paddy hub": { lat: 16.5417, lon: 80.5847, name: "Vijayawada Central Paddy Hub" },
  "vijayawada": { lat: 16.5417, lon: 80.5847, name: "Vijayawada Central Paddy Hub" },
  "kurnool rythu bharosa kendra": { lat: 15.8281, lon: 78.0373, name: "Kurnool Rythu Bharosa Kendra" },
  "kurnool": { lat: 15.8281, lon: 78.0373, name: "Kurnool Rythu Bharosa Kendra" },
  "rajahmundry godavari collection point": { lat: 17.0005, lon: 81.8040, name: "Rajahmundry Godavari Collection Point" },
  "rajahmundry": { lat: 17.0005, lon: 81.8040, name: "Rajahmundry Godavari Collection Point" },
  "eluru district procurement yard": { lat: 16.7107, lon: 81.0952, name: "Eluru District Procurement Yard" },
  "eluru": { lat: 16.7107, lon: 81.0952, name: "Eluru District Procurement Yard" },
  "nellore coastal paddy mandi": { lat: 14.4426, lon: 79.9865, name: "Nellore Coastal Paddy Mandi" },
  "nellore": { lat: 14.4426, lon: 79.9865, name: "Nellore Coastal Paddy Mandi" },
  "tirupati rayalaseema grain yard": { lat: 13.6288, lon: 79.4192, name: "Tirupati Rayalaseema Grain Yard" },
  "tirupati": { lat: 13.6288, lon: 79.4192, name: "Tirupati Rayalaseema Grain Yard" },
  "visakhapatnam anandapuram yard": { lat: 17.8864, lon: 83.3980, name: "Visakhapatnam Anandapuram Yard" },
  "visakhapatnam": { lat: 17.8864, lon: 83.3980, name: "Visakhapatnam Anandapuram Yard" },
  "nizamabad agricultural market yard": { lat: 18.6725, lon: 78.0941, name: "Nizamabad Agricultural Market Yard" },
  "nizamabad": { lat: 18.6725, lon: 78.0941, name: "Nizamabad Agricultural Market Yard" },
  "tenali agricultural market committee": { lat: 16.2437, lon: 80.6400, name: "Tenali Agricultural Market Committee" },
  "tenali": { lat: 16.2437, lon: 80.6400, name: "Tenali Agricultural Market Committee" },
  "miryalaguda mandi hub": { lat: 16.8667, lon: 79.5667, name: "Miryalaguda Mandi Hub" },
  "miryalaguda": { lat: 16.8667, lon: 79.5667, name: "Miryalaguda Mandi Hub" },
  "warangal enumamula market yard": { lat: 17.9689, lon: 79.5941, name: "Warangal Enumamula Market Yard" },
  "warangal": { lat: 17.9689, lon: 79.5941, name: "Warangal Enumamula Market Yard" },
  "khammam apmc yard": { lat: 17.2473, lon: 80.1514, name: "Khammam APMC Yard" },
  "khammam": { lat: 17.2473, lon: 80.1514, name: "Khammam APMC Yard" },

  // Farming Villages / Pickup Points
  "muppalapally": { lat: 16.3285, lon: 80.3540, name: "Muppalapally, Guntur" },
  "angalakuduru": { lat: 16.2215, lon: 80.6120, name: "Angalakuduru, Tenali" },
  "kaza": { lat: 16.4250, lon: 80.5480, name: "Kaza, Mangalagiri" },
  "chinnakandukur": { lat: 17.4812, lon: 78.8920, name: "Chinnakandukur, Yadadri" },
  "nadikudi": { lat: 16.5890, lon: 79.9120, name: "Nadikudi, Palnadu" },
  "pedanandipadu": { lat: 16.0350, lon: 80.3420, name: "Pedanandipadu, Guntur" },
  "chebrolu": { lat: 16.1950, lon: 80.5280, name: "Chebrolu, Guntur" },
  "ponnur": { lat: 16.0680, lon: 80.5560, name: "Ponnur, Guntur" },
  "morampudi": { lat: 15.9870, lon: 80.4510, name: "Morampudi, Guntur" },
  "duggirala": { lat: 16.3280, lon: 80.6270, name: "Duggirala, Guntur" },
  "mangalagiri": { lat: 16.4310, lon: 80.5620, name: "Mangalagiri, Guntur" },
  "bapatla": { lat: 15.9040, lon: 80.4680, name: "Bapatla, Bapatla" },
};

/**
 * Normalizes and looks up coordinates for a location string.
 * Only matches if the input is primarily a known mandi/village name,
 * ensuring detailed street addresses are preserved for Google Maps geocoding.
 */
export function lookupLocationCoordinates(text?: string | null): { lat: number; lon: number } | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim().toLowerCase();
  if (!clean) return null;

  // 1. Exact match on registry key or registry display name
  if (LOGISTICS_COORDINATES[clean]) {
    return { lat: LOGISTICS_COORDINATES[clean].lat, lon: LOGISTICS_COORDINATES[clean].lon };
  }

  for (const coords of Object.values(LOGISTICS_COORDINATES)) {
    if (clean === coords.name.toLowerCase()) {
      return { lat: coords.lat, lon: coords.lon };
    }
  }

  // 2. Direct match for clean inputs (e.g. "Guntur APMC", "Muppalapally Village", "Guntur Mandi")
  for (const [key, coords] of Object.entries(LOGISTICS_COORDINATES)) {
    if (key.length >= 5 && (clean === `${key} village` || clean === `${key} mandi` || clean === `${key} apmc` || clean === `${key} market`)) {
      return { lat: coords.lat, lon: coords.lon };
    }
  }

  return null;
}

/**
 * Formats a location parameter for Google Maps Directions URL.
 * Prefers exact coordinate string ("lat,lng") if available, otherwise safely URL-encodes address.
 */
export function formatLocationParam(
  location?: string | LocationCoordinate | null,
  overrideCoords?: LocationCoordinate | null
): string | null {
  // 1. Explicit override coordinates
  if (overrideCoords && typeof overrideCoords.lat === "number") {
    const lon = typeof overrideCoords.lon === "number" ? overrideCoords.lon : overrideCoords.lng;
    if (typeof lon === "number") {
      return `${overrideCoords.lat.toFixed(6)},${lon.toFixed(6)}`;
    }
  }

  // 2. Object with lat/lng
  if (location && typeof location === "object") {
    const lon = typeof location.lon === "number" ? location.lon : location.lng;
    if (typeof location.lat === "number" && typeof lon === "number") {
      return `${location.lat.toFixed(6)},${lon.toFixed(6)}`;
    }
  }

  // 3. String location
  if (typeof location === "string") {
    const trimmed = location.trim();
    if (!trimmed) return null;

    // Check if string is already formatted as "lat,lng" (e.g., "16.2970,80.4350")
    const coordMatch = trimmed.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      return `${parseFloat(coordMatch[1]).toFixed(6)},${parseFloat(coordMatch[3]).toFixed(6)}`;
    }

    // Lookup verified coordinates in agricultural registry
    const foundCoords = lookupLocationCoordinates(trimmed);
    if (foundCoords) {
      return `${foundCoords.lat.toFixed(6)},${foundCoords.lon.toFixed(6)}`;
    }

    // Fall back to clean URL-encoded address text
    return encodeURIComponent(trimmed);
  }

  return null;
}

export interface GoogleMapsDirectionsOptions {
  origin?: string | LocationCoordinate | null;
  destination?: string | LocationCoordinate | null;
  originCoords?: LocationCoordinate | null;
  destinationCoords?: LocationCoordinate | null;
}

export interface GoogleMapsDirectionsResult {
  url: string | null;
  success: boolean;
  error?: string;
  originFormatted?: string;
  destinationFormatted?: string;
}

/**
 * Generates the official Google Maps Directions URL.
 * URL structure:
 * https://www.google.com/maps/dir/?api=1&origin=ORIGIN&destination=DESTINATION&travelmode=driving
 */
export function generateGoogleMapsDirectionsUrl(
  options: GoogleMapsDirectionsOptions
): GoogleMapsDirectionsResult {
  const { origin, destination, originCoords, destinationCoords } = options;

  const originParam = formatLocationParam(origin, originCoords);
  if (!originParam) {
    return {
      url: null,
      success: false,
      error: "Pickup location address or coordinates are missing.",
    };
  }

  const destinationParam = formatLocationParam(destination, destinationCoords);
  if (!destinationParam) {
    return {
      url: null,
      success: false,
      error: "Destination mandi address or coordinates are missing.",
    };
  }

  const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`;

  return {
    url,
    success: true,
    originFormatted: originParam,
    destinationFormatted: destinationParam,
  };
}

/**
 * Opens Google Maps directions in a new tab or native mobile app.
 * Returns true if navigation was triggered, or false if validation failed.
 */
export function openGoogleMapsDirections(
  options: GoogleMapsDirectionsOptions,
  onError?: (errorMessage: string) => void
): boolean {
  const result = generateGoogleMapsDirectionsUrl(options);

  if (!result.success || !result.url) {
    const errorMsg = result.error || "Unable to open Google Maps: missing location details.";
    if (onError) {
      onError(errorMsg);
    } else if (typeof window !== "undefined" && (window as any).toast) {
      (window as any).toast.error(errorMsg);
    } else {
      console.warn("[Google Maps Redirection]", errorMsg);
    }
    return false;
  }

  if (typeof window !== "undefined") {
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return true;
}
