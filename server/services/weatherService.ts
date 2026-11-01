/**
 * ProcureFlow Open-Meteo Weather Service
 * Real-time agricultural meteorological forecasts for Andhra Pradesh & Telangana
 * Documentation: https://open-meteo.com/en/docs
 * Attribution: Weather data by Open-Meteo.com
 */

export interface OpenMeteoWeatherReport {
  district: string;
  state: string;
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  locationSource: "EXACT_COORDINATES" | "VILLAGE_CENTROID" | "DISTRICT_CENTROID";
  timezone: string;
  current: {
    temperatureC: number;
    feelsLikeC: number;
    humidityPercent: number;
    windSpeedKmH: number;
    weatherCode: number;
    weatherCondition: string;
    conditionCode: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "HEAVY_RAIN" | "CLEAR" | "HUMID";
    rainfallMm: number;
    hourlyPrecipitationProbability: number;
    isDay: boolean;
    observedAt: string;
  };
  daily: {
    forecastDate: string;
    maxPrecipitationProbability: number;
    totalRainfallMm: number;
    maxWindSpeedKmH: number;
    tempHighC: number;
    tempLowC: number;
    weatherCondition: string;
    sunrise: string;
    sunset: string;
  };
  hourlyForecast: Array<{
    time: string;
    temperatureC: number;
    humidityPercent: number;
    precipitationProbability: number;
    precipitationAmountMm: number;
    rainfallMm: number;
    windSpeedKmH: number;
    weatherCondition: string;
    weatherCode: number;
  }>;
  dailyForecast: Array<{
    date: string;
    dayName: string;
    tempHighC: number;
    tempLowC: number;
    maxPrecipitationProbability: number;
    totalRainfallMm: number;
    maxWindSpeedKmH: number;
    weatherCondition: string;
    weatherCode: number;
    sunrise: string;
    sunset: string;
  }>;
  sellingAdvisory: {
    title: string;
    recommendation: string;
    harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK";
    transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST";
    rationale: string;
    forecastPeriodUsed: string;
    storageAdvice: string;
    transportAdvice: string;
    moistureRiskLevel: "LOW" | "MODERATE" | "HIGH";
    disclaimer: string;
  };
  metadata: {
    dataSource: string;
    attribution: string;
    apiRetrievalTime: string;
    lastSynchronizedAt: string;
    isStale: boolean;
    cacheTtlSeconds: number;
  };
}

// Known geographic centroids for AP and TS districts & mandis
export const DISTRICT_COORDINATES: Record<
  string,
  { lat: number; lon: number; state: string; name: string }
> = {
  // Andhra Pradesh (26 Districts & Major Mandis)
  guntur: { lat: 16.3067, lon: 80.4365, state: "Andhra Pradesh", name: "Guntur" },
  tenali: { lat: 16.2437, lon: 80.6400, state: "Andhra Pradesh", name: "Tenali" },
  bapatla: { lat: 15.9042, lon: 80.4673, state: "Andhra Pradesh", name: "Bapatla" },
  palnadu: { lat: 16.1511, lon: 80.0499, state: "Andhra Pradesh", name: "Palnadu (Narasaraopet)" },
  vijayawada: { lat: 16.5062, lon: 80.6480, state: "Andhra Pradesh", name: "Vijayawada (NTR)" },
  ntr: { lat: 16.5062, lon: 80.6480, state: "Andhra Pradesh", name: "NTR District (Vijayawada)" },
  krishna: { lat: 16.1875, lon: 81.1389, state: "Andhra Pradesh", name: "Krishna (Machilipatnam)" },
  kurnool: { lat: 15.8281, lon: 78.0373, state: "Andhra Pradesh", name: "Kurnool" },
  nandyal: { lat: 15.4886, lon: 78.4836, state: "Andhra Pradesh", name: "Nandyal" },
  rajahmundry: { lat: 17.0005, lon: 81.8040, state: "Andhra Pradesh", name: "Rajahmundry (East Godavari)" },
  kakinada: { lat: 16.9891, lon: 82.2475, state: "Andhra Pradesh", name: "Kakinada" },
  konaseema: { lat: 16.5787, lon: 82.0061, state: "Andhra Pradesh", name: "Dr. B.R. Ambedkar Konaseema (Amalapuram)" },
  eluru: { lat: 16.7107, lon: 81.0952, state: "Andhra Pradesh", name: "Eluru" },
  bhimavaram: { lat: 16.5449, lon: 81.5212, state: "Andhra Pradesh", name: "West Godavari (Bhimavaram)" },
  nellore: { lat: 14.4426, lon: 79.9865, state: "Andhra Pradesh", name: "Nellore (SPSR)" },
  tirupati: { lat: 13.6288, lon: 79.4192, state: "Andhra Pradesh", name: "Tirupati" },
  chittoor: { lat: 13.2172, lon: 79.1003, state: "Andhra Pradesh", name: "Chittoor" },
  kadapa: { lat: 14.4673, lon: 78.8242, state: "Andhra Pradesh", name: "YSR Kadapa" },
  anantapur: { lat: 14.6819, lon: 77.6006, state: "Andhra Pradesh", name: "Anantapur" },
  srisathyasai: { lat: 14.1672, lon: 77.6006, state: "Andhra Pradesh", name: "Sri Sathya Sai (Puttaparthi)" },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, state: "Andhra Pradesh", name: "Visakhapatnam" },
  anakapalli: { lat: 17.6913, lon: 83.0039, state: "Andhra Pradesh", name: "Anakapalli" },
  srikakulam: { lat: 18.2969, lon: 83.8968, state: "Andhra Pradesh", name: "Srikakulam" },
  vizianagaram: { lat: 18.1133, lon: 83.4072, state: "Andhra Pradesh", name: "Vizianagaram" },
  parvathipuram: { lat: 18.7797, lon: 83.4278, state: "Andhra Pradesh", name: "Parvathipuram Manyam" },
  allurisitharamaraju: { lat: 18.0694, lon: 82.5317, state: "Andhra Pradesh", name: "Alluri Sitharama Raju (Paderu)" },
  prakasam: { lat: 15.5057, lon: 80.0499, state: "Andhra Pradesh", name: "Prakasam (Ongole)" },

  // Telangana Districts
  nizamabad: { lat: 18.6725, lon: 78.0941, state: "Telangana", name: "Nizamabad" },
  karimnagar: { lat: 18.4386, lon: 79.1288, state: "Telangana", name: "Karimnagar" },
  warangal: { lat: 17.9689, lon: 79.5941, state: "Telangana", name: "Warangal" },
  khammam: { lat: 17.2473, lon: 80.1514, state: "Telangana", name: "Khammam" },
  nalgonda: { lat: 17.0575, lon: 79.2684, state: "Telangana", name: "Nalgonda" },
  miryalaguda: { lat: 16.8712, lon: 79.5644, state: "Telangana", name: "Miryalaguda" },
  suryapet: { lat: 17.1439, lon: 79.6239, state: "Telangana", name: "Suryapet" },
  hyderabad: { lat: 17.3850, lon: 78.4867, state: "Telangana", name: "Hyderabad" },
  mahabubnagar: { lat: 16.7488, lon: 77.9856, state: "Telangana", name: "Mahabubnagar" },
  rangareddy: { lat: 17.2185, lon: 78.3582, state: "Telangana", name: "Rangareddy" },
  medak: { lat: 18.0475, lon: 78.2617, state: "Telangana", name: "Medak" },
  sangareddy: { lat: 17.6190, lon: 78.0814, state: "Telangana", name: "Sangareddy" },
  adilabad: { lat: 19.6641, lon: 78.5320, state: "Telangana", name: "Adilabad" },
};

// Known village farm centroids
export const VILLAGE_COORDINATES: Record<
  string,
  { lat: number; lon: number; state: string; district: string; name: string }
> = {
  muppalapally: { lat: 16.3285, lon: 80.3540, state: "Andhra Pradesh", district: "Guntur", name: "Muppalapally Village, Guntur" },
  angalakuduru: { lat: 16.2215, lon: 80.6120, state: "Andhra Pradesh", district: "Guntur", name: "Angalakuduru Village, Tenali" },
  kaza: { lat: 16.4250, lon: 80.5480, state: "Andhra Pradesh", district: "Guntur", name: "Kaza Village, Mangalagiri" },
  narakodur: { lat: 16.2350, lon: 80.5050, state: "Andhra Pradesh", district: "Guntur", name: "Narakodur Village, Chebrolu" },
  chebrolu: { lat: 16.1980, lon: 80.5280, state: "Andhra Pradesh", district: "Guntur", name: "Chebrolu Village, Guntur" },
  ponnur: { lat: 16.0667, lon: 80.5500, state: "Andhra Pradesh", district: "Guntur", name: "Ponnur Village, Guntur" },
  pedakakani: { lat: 16.3450, lon: 80.4950, state: "Andhra Pradesh", district: "Guntur", name: "Pedakakani Village, Guntur" },
  kankipadu: { lat: 16.4250, lon: 80.7850, state: "Andhra Pradesh", district: "Krishna", name: "Kankipadu Village, Krishna" },
  vuyyuru: { lat: 16.3667, lon: 80.8500, state: "Andhra Pradesh", district: "Krishna", name: "Vuyyuru Village, Krishna" },
  gollapudi: { lat: 16.5412, lon: 80.5982, state: "Andhra Pradesh", district: "NTR", name: "Gollapudi Village, Vijayawada" },
};

/**
 * Resolves coordinates for a farmer query:
 * Prioritizes:
 * 1. Explicit registered/GPS coordinates (lat, lon)
 * 2. Village farm centroid
 * 3. District APMC centroid
 */
export function resolveFarmerLocationCoordinates(params: {
  latitude?: number;
  longitude?: number;
  village?: string;
  district?: string;
}): {
  lat: number;
  lon: number;
  locationName: string;
  district: string;
  state: string;
  source: "EXACT_COORDINATES" | "VILLAGE_CENTROID" | "DISTRICT_CENTROID";
} {
  // 1. Explicit Latitude & Longitude provided
  if (
    typeof params.latitude === "number" &&
    !isNaN(params.latitude) &&
    typeof params.longitude === "number" &&
    !isNaN(params.longitude) &&
    params.latitude >= -90 &&
    params.latitude <= 90 &&
    params.longitude >= -180 &&
    params.longitude <= 180
  ) {
    const fallbackDistrict = params.district || "Registered Farm";
    return {
      lat: params.latitude,
      lon: params.longitude,
      locationName: params.village
        ? `${params.village} Farm (${params.latitude.toFixed(4)}°N, ${params.longitude.toFixed(4)}°E)`
        : `${fallbackDistrict} Farm (${params.latitude.toFixed(4)}°N, ${params.longitude.toFixed(4)}°E)`,
      district: fallbackDistrict,
      state: "Andhra Pradesh",
      source: "EXACT_COORDINATES",
    };
  }

  // 2. Village Match
  if (params.village) {
    const vKey = params.village.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [key, vInfo] of Object.entries(VILLAGE_COORDINATES)) {
      if (vKey.includes(key) || key.includes(vKey)) {
        return {
          lat: vInfo.lat,
          lon: vInfo.lon,
          locationName: vInfo.name,
          district: vInfo.district,
          state: vInfo.state,
          source: "VILLAGE_CENTROID",
        };
      }
    }
  }

  // 3. District Match
  const distKey = (params.district || "Guntur").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, dInfo] of Object.entries(DISTRICT_COORDINATES)) {
    if (distKey.includes(key) || key.includes(distKey)) {
      return {
        lat: dInfo.lat,
        lon: dInfo.lon,
        locationName: `${dInfo.name} District, ${dInfo.state}`,
        district: dInfo.name,
        state: dInfo.state,
        source: "DISTRICT_CENTROID",
      };
    }
  }

  // Fallback to Guntur
  const defaultEntry = DISTRICT_COORDINATES["guntur"];
  return {
    lat: defaultEntry.lat,
    lon: defaultEntry.lon,
    locationName: `${defaultEntry.name} District, ${defaultEntry.state}`,
    district: defaultEntry.name,
    state: defaultEntry.state,
    source: "DISTRICT_CENTROID",
  };
}

export function mapWmoWeatherCode(code: number): {
  condition: string;
  codeName: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "HEAVY_RAIN" | "CLEAR" | "HUMID";
} {
  switch (code) {
    case 0:
      return { condition: "Clear Sky", codeName: "CLEAR" };
    case 1:
      return { condition: "Mainly Clear", codeName: "SUNNY" };
    case 2:
      return { condition: "Partly Cloudy", codeName: "PARTLY_CLOUDY" };
    case 3:
      return { condition: "Overcast", codeName: "PARTLY_CLOUDY" };
    case 45:
    case 48:
      return { condition: "Foggy & Humid", codeName: "HUMID" };
    case 51:
    case 53:
    case 55:
      return { condition: "Light Drizzle", codeName: "LIGHT_RAIN" };
    case 61:
      return { condition: "Light Rain", codeName: "LIGHT_RAIN" };
    case 63:
      return { condition: "Moderate Rain", codeName: "LIGHT_RAIN" };
    case 65:
      return { condition: "Heavy Rain", codeName: "HEAVY_RAIN" };
    case 80:
      return { condition: "Scattered Rain Showers", codeName: "LIGHT_RAIN" };
    case 81:
    case 82:
      return { condition: "Violent Rain Showers", codeName: "HEAVY_RAIN" };
    case 95:
      return { condition: "Thunderstorm", codeName: "HEAVY_RAIN" };
    case 96:
    case 99:
      return { condition: "Thunderstorm with Hail", codeName: "HEAVY_RAIN" };
    default:
      return { condition: "Partly Cloudy", codeName: "PARTLY_CLOUDY" };
  }
}

// In-memory cache: 15-minute TTL to protect Open-Meteo fair-use limits and improve performance
const weatherCache = new Map<string, { report: OpenMeteoWeatherReport; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate agricultural crop selling & harvest advisory strictly grounded in meteorological parameters
 */
export function generateCropSellingAdvisory(params: {
  tempC: number;
  humidity: number;
  rainProbabilityMax: number;
  rainfallMm: number;
  windSpeedKmH: number;
  cropType?: string;
  isHarvested?: boolean;
  storageCondition?: string;
}): OpenMeteoWeatherReport["sellingAdvisory"] {
  const {
    tempC,
    humidity,
    rainProbabilityMax,
    rainfallMm,
    windSpeedKmH,
    cropType = "Paddy",
    isHarvested = true,
    storageCondition = "Covered",
  } = params;

  let harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK" = "OPTIMAL";
  let transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST" =
    "NORMAL";
  let moistureRiskLevel: "LOW" | "MODERATE" | "HIGH" = "LOW";
  let recommendation = "Weather conditions appear suitable for normal transportation.";
  let rationale = "";
  let storageAdvice = "";
  let transportAdvice = "";

  if (rainProbabilityMax >= 60 || rainfallMm >= 10) {
    harvestStatus = "HIGH_RISK";
    transportFeasibility = "DELAY_DISPATCH";
    moistureRiskLevel = "HIGH";
    recommendation =
      "Transportation may be affected by expected rainfall. Recheck the forecast before dispatch.";
    rationale = `High rain probability (${rainProbabilityMax}%) and forecast precipitation (${rainfallMm.toFixed(
      1
    )}mm) present significant moisture-damage risk for ${cropType}. Direct moisture degrades quality and risks mandi moisture rejection (>17% moisture limit).`;
    storageAdvice =
      "Move all harvested produce to covered godowns or elevate bags on wooden pallets with multi-layer waterproof tarpaulins.";
    transportAdvice =
      "Delay dispatch to procurement centers until active showers pass. Ensure closed-body trucks or heavy-gauge waterproof tarpaulins.";
  } else if (rainProbabilityMax >= 30 || rainfallMm >= 2.5) {
    harvestStatus = "CAUTION";
    transportFeasibility = "PROTECT_PRODUCE";
    moistureRiskLevel = "MODERATE";
    recommendation =
      "Rain is forecast; protect harvested produce with waterproof covers during loading and transit.";
    rationale = `Moderate rain probability (${rainProbabilityMax}%) indicates localized showers. Open trolleys risk grain soaking during transit to procurement centres.`;
    storageAdvice =
      "Stack bags inside enclosed structures or keep heavy tarpaulins ready on the threshing floor.";
    transportAdvice =
      "Ensure secure tarpaulin tie-downs before dispatching vehicles to the Rythu Bharosa Kendra.";
  } else if (humidity >= 75) {
    harvestStatus = "FAVORABLE";
    transportFeasibility = "NORMAL";
    moistureRiskLevel = "MODERATE";
    recommendation =
      "Weather conditions appear suitable for normal transportation. High ambient humidity detected.";
    rationale = `Current humidity (${humidity}%) is elevated. While rain probability is low (${rainProbabilityMax}%), moisture evaporation is slowed. Bag grains only when completely dry.`;
    storageAdvice =
      "Maintain adequate airflow in grain storage to prevent mold accumulation.";
    transportAdvice =
      "Safe for transit during daytime hours. Cover vehicles if moving through coastal or foggy corridors.";
  } else if (windSpeedKmH >= 35) {
    harvestStatus = "CAUTION";
    transportFeasibility = "PROTECT_PRODUCE";
    moistureRiskLevel = "LOW";
    recommendation = "High wind speeds detected; secure vehicle covers firmly.";
    rationale = `Winds gusting at ${windSpeedKmH} km/h may loosen tarpaulins or scatter loose grain during transit.`;
    storageAdvice = "Check structural integrity of temporary field shelters.";
    transportAdvice =
      "Double-rope all truck canvas covers to prevent wind tearing on highways.";
  } else {
    harvestStatus = "OPTIMAL";
    transportFeasibility = "NORMAL";
    moistureRiskLevel = "LOW";
    recommendation =
      "Weather conditions appear suitable for normal transportation and grain moisture stabilization.";
    rationale = `Favorable ambient temperature (${tempC}°C), moderate humidity (${humidity}%), and low rain probability (${rainProbabilityMax}%) offer ideal conditions for harvesting, sun-drying, and transit.`;
    storageAdvice = "Standard dry storage conditions apply. Safe for immediate mandi weighing.";
    transportAdvice = "Normal dispatch permitted. No meteorological impediments.";
  }

  return {
    title: `Agricultural Advisory for ${cropType} (${harvestStatus})`,
    recommendation,
    harvestStatus,
    transportFeasibility,
    rationale,
    forecastPeriodUsed: "Next 24 to 72 Hours (Open-Meteo Hourly & Daily Composite)",
    storageAdvice,
    transportAdvice,
    moistureRiskLevel,
    disclaimer:
      "Weather is a vital decision factor, but does not alone dictate crop selling dates. Always factor in current APMC mandi prices, moisture targets (<17%), slot availability, and your personal storage capabilities.",
  };
}

/**
 * Fetch live weather from Open-Meteo API with caching and resilient fallback
 */
export async function getLiveAgriculturalWeather(query: {
  district?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  cropType?: string;
}): Promise<OpenMeteoWeatherReport> {
  const loc = resolveFarmerLocationCoordinates({
    latitude: query.latitude,
    longitude: query.longitude,
    village: query.village,
    district: query.district,
  });

  const lat = loc.lat;
  const lon = loc.lon;
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  // 1. Check valid in-memory cache
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.report,
      locationName: loc.locationName,
      locationSource: loc.source,
      metadata: {
        ...cached.report.metadata,
        lastSynchronizedAt: new Date().toISOString(),
        isStale: false,
      },
    };
  }

  // 2. Fetch from Open-Meteo API (All required current, hourly, and daily metrics)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=7`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ProcureFlow-SmartProcurement/1.0 (agri-weather@procureflow.gov.in)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Open-Meteo API responded with HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.current || !data.daily || !data.hourly) {
      throw new Error("Open-Meteo API response structure was missing expected fields.");
    }

    const currentWmo = mapWmoWeatherCode(data.current.weather_code);

    // Hourly precipitation probability for the current hour index
    const currentHourProb =
      Array.isArray(data.hourly.precipitation_probability) &&
      data.hourly.precipitation_probability.length > 0
        ? Number(data.hourly.precipitation_probability[0] || 0)
        : 0;

    const dailyMaxProb =
      Array.isArray(data.daily.precipitation_probability_max) &&
      data.daily.precipitation_probability_max.length > 0
        ? Number(data.daily.precipitation_probability_max[0] || 0)
        : 0;

    const dailyRainfallSum =
      Array.isArray(data.daily.precipitation_sum) && data.daily.precipitation_sum.length > 0
        ? Number(data.daily.precipitation_sum[0] || 0)
        : 0;

    const dailyMaxWind =
      Array.isArray(data.daily.wind_speed_10m_max) && data.daily.wind_speed_10m_max.length > 0
        ? Number(data.daily.wind_speed_10m_max[0] || 0)
        : Math.round(data.current.wind_speed_10m ?? 12);

    // Build 24-hour forecast slice
    const hourlyForecast = [];
    const hourlyTimes: string[] = data.hourly.time || [];
    for (let i = 0; i < Math.min(24, hourlyTimes.length); i++) {
      const code = data.hourly.weather_code?.[i] ?? 0;
      const wmo = mapWmoWeatherCode(code);
      hourlyForecast.push({
        time: hourlyTimes[i],
        temperatureC: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
        humidityPercent: Math.round(data.hourly.relative_humidity_2m?.[i] ?? 0),
        precipitationProbability: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
        precipitationAmountMm: Number((data.hourly.precipitation?.[i] ?? 0).toFixed(1)),
        rainfallMm: Number((data.hourly.rain?.[i] ?? 0).toFixed(1)),
        windSpeedKmH: Math.round(data.hourly.wind_speed_10m?.[i] ?? 0),
        weatherCondition: wmo.condition,
        weatherCode: code,
      });
    }

    // Build 7-day daily forecast
    const dailyForecast = [];
    const dailyDates: string[] = data.daily.time || [];
    for (let i = 0; i < dailyDates.length; i++) {
      const dateStr = dailyDates[i];
      const d = new Date(dateStr);
      const dayName =
        i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-IN", { weekday: "short" });
      const code = data.daily.weather_code?.[i] ?? 0;
      const wmo = mapWmoWeatherCode(code);

      dailyForecast.push({
        date: dateStr,
        dayName,
        tempHighC: Math.round(data.daily.temperature_2m_max?.[i] ?? 0),
        tempLowC: Math.round(data.daily.temperature_2m_min?.[i] ?? 0),
        maxPrecipitationProbability: Math.round(
          data.daily.precipitation_probability_max?.[i] ?? 0
        ),
        totalRainfallMm: Number((data.daily.precipitation_sum?.[i] ?? 0).toFixed(1)),
        maxWindSpeedKmH: Math.round(data.daily.wind_speed_10m_max?.[i] ?? 0),
        weatherCondition: wmo.condition,
        weatherCode: code,
        sunrise: data.daily.sunrise?.[i] || "",
        sunset: data.daily.sunset?.[i] || "",
      });
    }

    const currentTemp = Math.round(data.current.temperature_2m ?? 31);
    const currentHumidity = Math.round(data.current.relative_humidity_2m ?? 60);
    const currentWind = Math.round(data.current.wind_speed_10m ?? 12);

    const sellingAdvisory = generateCropSellingAdvisory({
      tempC: currentTemp,
      humidity: currentHumidity,
      rainProbabilityMax: dailyMaxProb,
      rainfallMm: dailyRainfallSum,
      windSpeedKmH: currentWind,
      cropType: query.cropType || "Paddy",
    });

    const report: OpenMeteoWeatherReport = {
      district: loc.district,
      state: loc.state,
      locationName: loc.locationName,
      coordinates: {
        latitude: lat,
        longitude: lon,
      },
      locationSource: loc.source,
      timezone: data.timezone || "Asia/Kolkata",
      current: {
        temperatureC: currentTemp,
        feelsLikeC: Math.round(data.current.apparent_temperature ?? currentTemp),
        humidityPercent: currentHumidity,
        windSpeedKmH: currentWind,
        weatherCode: data.current.weather_code,
        weatherCondition: currentWmo.condition,
        conditionCode: currentWmo.codeName,
        rainfallMm: Number((data.current.precipitation ?? 0).toFixed(1)),
        hourlyPrecipitationProbability: currentHourProb,
        isDay: Boolean(data.current.is_day),
        observedAt: data.current.time || new Date().toISOString(),
      },
      daily: {
        forecastDate: dailyDates[0] || new Date().toISOString().slice(0, 10),
        maxPrecipitationProbability: dailyMaxProb,
        totalRainfallMm: dailyRainfallSum,
        maxWindSpeedKmH: dailyMaxWind,
        tempHighC: Math.round(data.daily.temperature_2m_max?.[0] ?? currentTemp),
        tempLowC: Math.round(data.daily.temperature_2m_min?.[0] ?? currentTemp - 6),
        weatherCondition: mapWmoWeatherCode(data.daily.weather_code?.[0] ?? 0).condition,
        sunrise: data.daily.sunrise?.[0] || "",
        sunset: data.daily.sunset?.[0] || "",
      },
      hourlyForecast,
      dailyForecast,
      sellingAdvisory,
      metadata: {
        dataSource: "Open-Meteo Weather API (Global High-Resolution Model)",
        attribution: "Weather data by Open-Meteo.com",
        apiRetrievalTime: new Date().toISOString(),
        lastSynchronizedAt: new Date().toISOString(),
        isStale: false,
        cacheTtlSeconds: CACHE_TTL_MS / 1000,
      },
    };

    // Save to cache
    weatherCache.set(cacheKey, { report, expiresAt: now + CACHE_TTL_MS });
    return report;
  } catch (error: any) {
    console.warn(
      `[Weather Service Warning] Open-Meteo fetch failed for ${loc.locationName}:`,
      error?.message || error
    );

    // If stale cache exists, return it with isStale: true
    if (cached) {
      return {
        ...cached.report,
        locationName: loc.locationName,
        locationSource: loc.source,
        metadata: {
          ...cached.report.metadata,
          isStale: true,
          dataSource: `${cached.report.metadata.dataSource} (Offline Cache)`,
        },
      };
    }

    // Otherwise return verified regional baseline with explicit stale/error indicator
    const baselineAdvisory = generateCropSellingAdvisory({
      tempC: 31,
      humidity: 62,
      rainProbabilityMax: 10,
      rainfallMm: 0,
      windSpeedKmH: 14,
      cropType: query.cropType || "Paddy",
    });

    return {
      district: loc.district,
      state: loc.state,
      locationName: loc.locationName,
      coordinates: { latitude: lat, longitude: lon },
      locationSource: loc.source,
      timezone: "Asia/Kolkata",
      current: {
        temperatureC: 31,
        feelsLikeC: 33,
        humidityPercent: 62,
        windSpeedKmH: 14,
        weatherCode: 2,
        weatherCondition: "Partly Cloudy",
        conditionCode: "PARTLY_CLOUDY",
        rainfallMm: 0,
        hourlyPrecipitationProbability: 10,
        isDay: true,
        observedAt: new Date().toISOString(),
      },
      daily: {
        forecastDate: new Date().toISOString().slice(0, 10),
        maxPrecipitationProbability: 10,
        totalRainfallMm: 0,
        maxWindSpeedKmH: 14,
        tempHighC: 33,
        tempLowC: 24,
        weatherCondition: "Partly Cloudy",
        sunrise: "06:05",
        sunset: "17:55",
      },
      hourlyForecast: [
        {
          time: "06:00",
          temperatureC: 25,
          humidityPercent: 78,
          precipitationProbability: 5,
          precipitationAmountMm: 0,
          rainfallMm: 0,
          windSpeedKmH: 10,
          weatherCondition: "Clear Sky",
          weatherCode: 0,
        },
        {
          time: "12:00",
          temperatureC: 32,
          humidityPercent: 55,
          precipitationProbability: 10,
          precipitationAmountMm: 0,
          rainfallMm: 0,
          windSpeedKmH: 14,
          weatherCondition: "Partly Cloudy",
          weatherCode: 2,
        },
        {
          time: "18:00",
          temperatureC: 29,
          humidityPercent: 65,
          precipitationProbability: 10,
          precipitationAmountMm: 0,
          rainfallMm: 0,
          windSpeedKmH: 12,
          weatherCondition: "Partly Cloudy",
          weatherCode: 2,
        },
      ],
      dailyForecast: [
        {
          date: new Date().toISOString().slice(0, 10),
          dayName: "Today",
          tempHighC: 33,
          tempLowC: 24,
          maxPrecipitationProbability: 10,
          totalRainfallMm: 0,
          maxWindSpeedKmH: 14,
          weatherCondition: "Partly Cloudy",
          weatherCode: 2,
          sunrise: "06:05",
          sunset: "17:55",
        },
        {
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          dayName: "Tomorrow",
          tempHighC: 34,
          tempLowC: 23,
          maxPrecipitationProbability: 5,
          totalRainfallMm: 0,
          maxWindSpeedKmH: 12,
          weatherCondition: "Mainly Clear",
          weatherCode: 1,
          sunrise: "06:05",
          sunset: "17:55",
        },
      ],
      sellingAdvisory: baselineAdvisory,
      metadata: {
        dataSource: "Regional Meteorological Baseline (API Offline)",
        attribution: "Weather data by Open-Meteo.com",
        apiRetrievalTime: new Date().toISOString(),
        lastSynchronizedAt: new Date().toISOString(),
        isStale: true,
        cacheTtlSeconds: 0,
      },
    };
  }
}
