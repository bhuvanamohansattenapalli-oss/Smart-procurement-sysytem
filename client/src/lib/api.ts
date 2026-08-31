/**
 * Configurable base for the ProcureFlow REST backend.
 * Ensures all transactional mutations and queries (registrations, approvals, bookings, status)
 * communicate directly with the shared backend database across all client devices.
 */

export const API_BASE_URL = (
  (typeof window !== "undefined" && ((window as any).__PROCUREFLOW_API_URL__ || (window as any).API_BASE_URL)) ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");

export function apiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  }
  if (API_BASE_URL.endsWith("/api")) {
    const subPath = cleanPath.startsWith("/api/") ? cleanPath.slice(4) : (cleanPath === "/api" ? "" : cleanPath);
    return `${API_BASE_URL}${subPath}`;
  }
  const prefix = cleanPath.startsWith("/api") ? "" : "/api";
  return `${API_BASE_URL}${prefix}${cleanPath}`;
}

export class ApiError extends Error {
  status: number;
  data: any;
  contentType: string | null;
  url: string;

  constructor(message: string, status: number, data: any, contentType: string | null, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.contentType = contentType;
    this.url = url;
  }
}

/**
 * Safely parse a fetch Response as JSON.
 * If the response is HTML, plain text (e.g. "Not Found"), or non-JSON,
 * it creates a descriptive error explaining the URL and status rather than crashing with SyntaxError.
 */
export async function safeJsonResponse<T = any>(response: Response, url: string = ""): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json") || contentType.includes("application/problem+json");

  if (isJson) {
    try {
      return await response.json();
    } catch {
      throw new ApiError(
        `Failed to parse JSON response from ${url || response.url || "server"} (HTTP ${response.status})`,
        response.status,
        null,
        contentType,
        url || response.url
      );
    }
  }

  // Non-JSON response (e.g. <!DOCTYPE html... or "Not Found")
  const text = await response.text().catch(() => "");
  const snippet = text.slice(0, 120).trim();
  const message = response.status === 404
    ? `Backend API endpoint not found: ${url || response.url} (HTTP 404)`
    : `Server returned non-JSON response (${response.status} ${response.statusText}): "${snippet}"`;

  throw new ApiError(message, response.status, { rawText: snippet }, contentType, url || response.url);
}

/**
 * Centralized, robust API fetch client for all ProcureFlow HTTP calls.
 */
export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http://") || path.startsWith("https://") ? path : apiUrl(path);
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const data = await safeJsonResponse<T>(response, url);

  if (!response.ok) {
    const errMessage = (data as any)?.message || (data as any)?.error || `Request to ${url} failed with status ${response.status}`;
    throw new ApiError(errMessage, response.status, data, response.headers.get("content-type"), url);
  }

  return data;
}

if (typeof window !== "undefined") {
  (window as any).apiUrl = apiUrl;
  (window as any).API_BASE_URL = API_BASE_URL;
  (window as any).safeJsonResponse = safeJsonResponse;
  (window as any).apiFetch = apiFetch;
}


export const STATIC_CENTRES = [
  { id: 1, name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", district: "Guntur", latitude: 16.297, longitude: 80.435, distanceKm: 2.4, status: "OPEN", currentQueue: 18, availableSlots: 15 },
  { id: 2, name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", district: "NTR District", latitude: 16.5417, longitude: 80.5847, distanceKm: 4.8, status: "OPEN", currentQueue: 9, availableSlots: 20 },
  { id: 3, name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", district: "Kurnool", latitude: 15.8281, longitude: 78.0373, distanceKm: 6.5, status: "BUSY", currentQueue: 34, availableSlots: 8 },
  { id: 4, name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", district: "East Godavari", latitude: 17.0005, longitude: 81.804, distanceKm: 8.2, status: "LIMITED", currentQueue: 22, availableSlots: 5 },
  { id: 5, name: "Eluru District Procurement Yard", place: "Sanivarapupeta", district: "Eluru", latitude: 16.7107, longitude: 81.0952, distanceKm: 10.5, status: "OPEN", currentQueue: 12, availableSlots: 18 },
  { id: 6, name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", district: "Nellore", latitude: 14.4426, longitude: 79.9865, distanceKm: 13.8, status: "OPEN", currentQueue: 15, availableSlots: 12 },
  { id: 7, name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", district: "Tirupati", latitude: 13.6288, longitude: 79.4192, distanceKm: 15.2, status: "BUSY", currentQueue: 28, availableSlots: 6 },
  { id: 8, name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", district: "Visakhapatnam", latitude: 17.8864, longitude: 83.398, distanceKm: 18.5, status: "OPEN", currentQueue: 10, availableSlots: 16 },
];

export const STATIC_CROP_PRICES = [
  { id: 1, cropName: "Paddy (Common)", variety: "Standard / MTU 1010", category: "Cereals", mspPerQuintal: 2300, marketRatePerQuintal: 2280, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 2300, maxMoisturePercent: 17.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-01" },
  { id: 2, cropName: "Paddy (Grade A)", variety: "Grade A / BPT 5204", category: "Cereals", mspPerQuintal: 2320, marketRatePerQuintal: 2310, govtBonusPerQuintal: 50, effectiveRatePerQuintal: 2370, maxMoisturePercent: 17.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-02" },
  { id: 3, cropName: "Paddy (Parboiled)", variety: "Boiled Grade A", category: "Cereals", mspPerQuintal: 2320, marketRatePerQuintal: 2340, govtBonusPerQuintal: 30, effectiveRatePerQuintal: 2350, maxMoisturePercent: 15.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-03" },
  { id: 4, cropName: "Maize (Makka)", variety: "Hybrid Yellow", category: "Coarse Cereals", mspPerQuintal: 2225, marketRatePerQuintal: 2180, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 2225, maxMoisturePercent: 14.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-04" },
  { id: 5, cropName: "Cotton (Medium Staple)", variety: "Medium Staple", category: "Commercial", mspPerQuintal: 7121, marketRatePerQuintal: 6950, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 7121, maxMoisturePercent: 8.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-05" },
  { id: 6, cropName: "Cotton (Long Staple)", variety: "BT Cotton / DCH-32", category: "Commercial", mspPerQuintal: 7521, marketRatePerQuintal: 7480, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 7521, maxMoisturePercent: 8.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-06" },
  { id: 7, cropName: "Wheat (Gehun)", variety: "Kalyan Sona / Sharbati", category: "Cereals", mspPerQuintal: 2275, marketRatePerQuintal: 2250, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 2275, maxMoisturePercent: 12.0, effectiveSeason: "Rabi 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-07" },
  { id: 8, cropName: "Moong (Green Gram)", variety: "Shin Moong", category: "Pulses", mspPerQuintal: 8558, marketRatePerQuintal: 8400, govtBonusPerQuintal: 200, effectiveRatePerQuintal: 8758, maxMoisturePercent: 12.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-08" },
  { id: 9, cropName: "Soyabean (Yellow)", variety: "JS 335", category: "Oilseeds", mspPerQuintal: 4892, marketRatePerQuintal: 4650, govtBonusPerQuintal: 0, effectiveRatePerQuintal: 4892, maxMoisturePercent: 12.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-09" },
  { id: 10, cropName: "Groundnut (In Shell)", variety: "TMV-2 / Kadiri-6", category: "Oilseeds", mspPerQuintal: 6783, marketRatePerQuintal: 6600, govtBonusPerQuintal: 150, effectiveRatePerQuintal: 6933, maxMoisturePercent: 8.0, effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-10" },
];

export const STATIC_WEATHER = {
  guntur: {
    district: "Guntur",
    state: "Andhra Pradesh",
    temperature: 31,
    feelsLike: 33,
    condition: "Sunny & Dry",
    conditionCode: "SUNNY" as const,
    humidity: 58,
    windSpeedKmH: 12,
    precipitationChance: 5,
    uvIndex: 8,
    safeHarvestingIndex: "OPTIMAL" as const,
    advisoryEn: "Ideal conditions for paddy harvesting and moisture testing. Sun drying recommended before yard transit.",
    advisoryTe: "వరి కోత మరియు తేమ పరీక్షకు అనుకూలమైన వాతావరణం. యార్డుకు తీసుకెళ్లే ముందు ఎండలో ఆరబెట్టడం మంచిది.",
    advisoryHi: "धान की कटाई और नमी परीक्षण के लिए सर्वोत्तम मौसम। मंडी ले जाने से पहले धूप में सुखाना उचित है।",
    forecast: [
      { day: "Today", tempHigh: 33, tempLow: 23, condition: "Sunny", rainChance: 5 },
      { day: "Tomorrow", tempHigh: 34, tempLow: 24, condition: "Clear Sky", rainChance: 0 },
      { day: "Day 3", tempHigh: 32, tempLow: 23, condition: "Partly Cloudy", rainChance: 10 },
    ],
  },
};

export const STATIC_TRANSPORT_OPTIONS = [
  {
    type: "TRACTOR_TROLLEY" as const,
    name: "Tractor Trolley",
    capacityQuintals: "30 – 50 quintals",
    capacityTonnes: "3.0 – 5.0 tonnes",
    ratePerKm: 18,
    baseFare: 350,
    subsidyPercent: 30,
    suitableFor: "Village to mandi transit, unpaved farm roads",
    icon: "Tractor",
  },
  {
    type: "MINI_TRUCK" as const,
    name: "Mini Truck (Tata Ace / Bolero)",
    capacityQuintals: "15 – 25 quintals",
    capacityTonnes: "1.5 – 2.5 tonnes",
    ratePerKm: 22,
    baseFare: 400,
    subsidyPercent: 30,
    suitableFor: "Fast transit for small & marginal farmer harvests",
    icon: "Truck",
  },
  {
    type: "HEAVY_LORRY" as const,
    name: "Heavy Lorry (10-Wheeler)",
    capacityQuintals: "100 – 160 quintals",
    capacityTonnes: "10.0 – 16.0 tonnes",
    ratePerKm: 35,
    baseFare: 800,
    subsidyPercent: 30,
    suitableFor: "FPO / Farmer group pooled bulk harvest",
    icon: "Truck",
  },
];
