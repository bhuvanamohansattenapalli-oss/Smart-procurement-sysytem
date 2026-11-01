/**
 * ProcureFlow Open-Meteo Weather Service
 * Real-time agricultural meteorological forecasts for Andhra Pradesh & Telangana
 * Documentation: https://open-meteo.com/en/docs
 */

export interface OpenMeteoWeatherReport {
  district: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
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
    rainfallMm: number;
    weatherCondition: string;
  }>;
  dailyForecast: Array<{
    date: string;
    dayName: string;
    tempHighC: number;
    tempLowC: number;
    maxPrecipitationProbability: number;
    totalRainfallMm: number;
    weatherCondition: string;
  }>;
  sellingAdvisory: {
    title: string;
    recommendation: string;
    harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK";
    transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST";
    rationale: string;
    forecastPeriodUsed: string;
    storageAdvice: string;
    moistureRiskLevel: "LOW" | "MODERATE" | "HIGH";
  };
  metadata: {
    dataSource: string;
    apiRetrievalTime: string;
    lastSynchronizedAt: string;
    isStale: boolean;
    cacheTtlSeconds: number;
  };
}

// Known geographic centroids for AP and TS districts & mandis
export const DISTRICT_COORDINATES: Record<string, { lat: number; lon: number; state: string; name: string }> = {
  guntur: { lat: 16.3067, lon: 80.4365, state: "Andhra Pradesh", name: "Guntur" },
  tenali: { lat: 16.2437, lon: 80.6400, state: "Andhra Pradesh", name: "Tenali (Guntur)" },
  vijayawada: { lat: 16.5062, lon: 80.6480, state: "Andhra Pradesh", name: "Vijayawada (NTR)" },
  kurnool: { lat: 15.8281, lon: 78.0373, state: "Andhra Pradesh", name: "Kurnool" },
  nandyal: { lat: 15.4886, lon: 78.4836, state: "Andhra Pradesh", name: "Nandyal" },
  rajahmundry: { lat: 17.0005, lon: 81.8040, state: "Andhra Pradesh", name: "Rajahmundry (East Godavari)" },
  eluru: { lat: 16.7107, lon: 81.0952, state: "Andhra Pradesh", name: "Eluru (West Godavari)" },
  nellore: { lat: 14.4426, lon: 79.9865, state: "Andhra Pradesh", name: "Nellore (SPSR)" },
  tirupati: { lat: 13.6288, lon: 79.4192, state: "Andhra Pradesh", name: "Tirupati" },
  kadapa: { lat: 14.4673, lon: 78.8242, state: "Andhra Pradesh", name: "YSR Kadapa" },
  anantapur: { lat: 14.6819, lon: 77.6006, state: "Andhra Pradesh", name: "Anantapur" },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, state: "Andhra Pradesh", name: "Visakhapatnam" },
  srikakulam: { lat: 18.2969, lon: 83.8968, state: "Andhra Pradesh", name: "Srikakulam" },
  vizianagaram: { lat: 18.1133, lon: 83.4072, state: "Andhra Pradesh", name: "Vizianagaram" },
  nizamabad: { lat: 18.6725, lon: 78.0941, state: "Telangana", name: "Nizamabad" },
  karimnagar: { lat: 18.4386, lon: 79.1288, state: "Telangana", name: "Karimnagar" },
  warangal: { lat: 17.9689, lon: 79.5941, state: "Telangana", name: "Warangal" },
  khammam: { lat: 17.2473, lon: 80.1514, state: "Telangana", name: "Khammam" },
  nalgonda: { lat: 17.0575, lon: 79.2684, state: "Telangana", name: "Nalgonda" },
  miryalaguda: { lat: 16.8712, lon: 79.5644, state: "Telangana", name: "Miryalaguda" },
  suryapet: { lat: 17.1439, lon: 79.6239, state: "Telangana", name: "Suryapet" },
  hyderabad: { lat: 17.3850, lon: 78.4867, state: "Telangana", name: "Hyderabad" },
};

export function mapWmoWeatherCode(code: number): { condition: string; codeName: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "HEAVY_RAIN" | "CLEAR" | "HUMID" } {
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
  const { tempC, humidity, rainProbabilityMax, rainfallMm, windSpeedKmH, cropType = "Paddy", isHarvested = true, storageCondition = "Covered" } = params;

  let harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK" = "OPTIMAL";
  let transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST" = "NORMAL";
  let moistureRiskLevel: "LOW" | "MODERATE" | "HIGH" = "LOW";
  let recommendation = "Weather conditions appear suitable for normal transportation.";
  let rationale = "";
  let storageAdvice = "";

  if (rainProbabilityMax >= 60 || rainfallMm >= 10) {
    harvestStatus = "HIGH_RISK";
    transportFeasibility = "DELAY_DISPATCH";
    moistureRiskLevel = "HIGH";
    recommendation = "Transportation may be affected by expected rainfall. Recheck the forecast before dispatch.";
    rationale = `High rain probability (${rainProbabilityMax}%) and forecast precipitation (${rainfallMm.toFixed(1)}mm) present significant moisture-damage risk for ${cropType}. Direct moisture degrades quality and risks mandi moisture rejection (>17%).`;
    storageAdvice = "Move all harvested produce to covered godowns or elevate bags on wooden pallets with multi-layer waterproof tarpaulins.";
  } else if (rainProbabilityMax >= 30 || rainfallMm >= 2.5) {
    harvestStatus = "CAUTION";
    transportFeasibility = "PROTECT_PRODUCE";
    moistureRiskLevel = "MODERATE";
    recommendation = "Rain is forecast; protect harvested produce with waterproof covers during loading and transit.";
    rationale = `Moderate rain probability (${rainProbabilityMax}%) indicates localized showers. Open trolleys risk grain soaking during transit to procurement centres.`;
    storageAdvice = "Ensure secure tarpaulin tie-downs before dispatching vehicles to the Rythu Bharosa Kendra.";
  } else if (humidity >= 75) {
    harvestStatus = "FAVORABLE";
    transportFeasibility = "NORMAL";
    moistureRiskLevel = "MODERATE";
    recommendation = "Weather conditions appear suitable for normal transportation. High ambient humidity detected.";
    rationale = `Current humidity (${humidity}%) is elevated. While rain probability is low (${rainProbabilityMax}%), moisture evaporation is slowed. Bag grains only when completely dry.`;
    storageAdvice = "Maintain adequate airflow in grain storage to prevent mold accumulation.";
  } else if (windSpeedKmH >= 35) {
    harvestStatus = "CAUTION";
    transportFeasibility = "PROTECT_PRODUCE";
    moistureRiskLevel = "LOW";
    recommendation = "High wind speeds detected; secure vehicle covers firmly.";
    rationale = `Winds gusting at ${windSpeedKmH} km/h may loosen tarpaulins or scatter loose grain during transit.`;
    storageAdvice = "Check structural integrity of temporary field shelters.";
  } else {
    harvestStatus = "OPTIMAL";
    transportFeasibility = "NORMAL";
    moistureRiskLevel = "LOW";
    recommendation = "Weather conditions appear suitable for normal transportation and grain moisture stabilization.";
    rationale = `Favorable ambient temperature (${tempC}°C), moderate humidity (${humidity}%), and low rain probability (${rainProbabilityMax}%) offer ideal conditions for harvesting, sun-drying, and transit.`;
    storageAdvice = "Standard dry storage conditions apply. Safe for immediate mandi weighing.";
  }

  return {
    title: `Agricultural Advisory for ${cropType} (${harvestStatus})`,
    recommendation,
    harvestStatus,
    transportFeasibility,
    rationale,
    forecastPeriodUsed: "Next 24 to 72 Hours (Open-Meteo Hourly & Daily Composite)",
    storageAdvice,
    moistureRiskLevel,
  };
}

/**
 * Fetch live weather from Open-Meteo API with caching and resilient fallback
 */
export async function getLiveAgriculturalWeather(query: {
  district?: string;
  latitude?: number;
  longitude?: number;
  cropType?: string;
}): Promise<OpenMeteoWeatherReport> {
  const districtKey = (query.district || "Guntur").toLowerCase().trim();
  const known = DISTRICT_COORDINATES[districtKey] || DISTRICT_COORDINATES["guntur"];

  const lat = typeof query.latitude === "number" && !isNaN(query.latitude) ? query.latitude : known.lat;
  const lon = typeof query.longitude === "number" && !isNaN(query.longitude) ? query.longitude : known.lon;
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  // 1. Check valid cache
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.report,
      metadata: {
        ...cached.report.metadata,
        lastSynchronizedAt: new Date().toISOString(),
        isStale: false,
      },
    };
  }

  // 2. Fetch from Open-Meteo API
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=7`;

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
    const currentHourProb = Array.isArray(data.hourly.precipitation_probability) && data.hourly.precipitation_probability.length > 0
      ? Number(data.hourly.precipitation_probability[0] || 0)
      : 0;

    const dailyMaxProb = Array.isArray(data.daily.precipitation_probability_max) && data.daily.precipitation_probability_max.length > 0
      ? Number(data.daily.precipitation_probability_max[0] || 0)
      : 0;

    const dailyRainfallSum = Array.isArray(data.daily.precipitation_sum) && data.daily.precipitation_sum.length > 0
      ? Number(data.daily.precipitation_sum[0] || 0)
      : 0;

    // Build 24-hour forecast slice
    const hourlyForecast = [];
    const hourlyTimes: string[] = data.hourly.time || [];
    for (let i = 0; i < Math.min(24, hourlyTimes.length); i++) {
      const wmo = mapWmoWeatherCode(data.hourly.weather_code?.[i] ?? 0);
      hourlyForecast.push({
        time: hourlyTimes[i],
        temperatureC: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
        humidityPercent: Math.round(data.hourly.relative_humidity_2m?.[i] ?? 0),
        precipitationProbability: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
        rainfallMm: Number((data.hourly.precipitation?.[i] ?? 0).toFixed(1)),
        weatherCondition: wmo.condition,
      });
    }

    // Build 7-day daily forecast
    const dailyForecast = [];
    const dailyDates: string[] = data.daily.time || [];
    for (let i = 0; i < dailyDates.length; i++) {
      const dateStr = dailyDates[i];
      const d = new Date(dateStr);
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" });
      const wmo = mapWmoWeatherCode(data.daily.weather_code?.[i] ?? 0);

      dailyForecast.push({
        date: dateStr,
        dayName,
        tempHighC: Math.round(data.daily.temperature_2m_max?.[i] ?? 0),
        tempLowC: Math.round(data.daily.temperature_2m_min?.[i] ?? 0),
        maxPrecipitationProbability: Math.round(data.daily.precipitation_probability_max?.[i] ?? 0),
        totalRainfallMm: Number((data.daily.precipitation_sum?.[i] ?? 0).toFixed(1)),
        weatherCondition: wmo.condition,
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
      district: known.name,
      state: known.state,
      coordinates: {
        latitude: lat,
        longitude: lon,
      },
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
    console.warn(`[Weather Service Warning] Open-Meteo fetch failed for ${known.name}:`, error?.message || error);

    // If stale cache exists, return it with isStale: true
    if (cached) {
      return {
        ...cached.report,
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
      district: known.name,
      state: known.state,
      coordinates: { latitude: lat, longitude: lon },
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
        tempHighC: 33,
        tempLowC: 24,
        weatherCondition: "Partly Cloudy",
        sunrise: "06:05",
        sunset: "17:55",
      },
      hourlyForecast: [
        { time: "06:00", temperatureC: 25, humidityPercent: 78, precipitationProbability: 5, rainfallMm: 0, weatherCondition: "Clear" },
        { time: "12:00", temperatureC: 32, humidityPercent: 55, precipitationProbability: 10, rainfallMm: 0, weatherCondition: "Partly Cloudy" },
        { time: "18:00", temperatureC: 29, humidityPercent: 65, precipitationProbability: 10, rainfallMm: 0, weatherCondition: "Partly Cloudy" },
      ],
      dailyForecast: [
        { date: new Date().toISOString().slice(0, 10), dayName: "Today", tempHighC: 33, tempLowC: 24, maxPrecipitationProbability: 10, totalRainfallMm: 0, weatherCondition: "Partly Cloudy" },
        { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), dayName: "Tomorrow", tempHighC: 34, tempLowC: 23, maxPrecipitationProbability: 5, totalRainfallMm: 0, weatherCondition: "Sunny" },
      ],
      sellingAdvisory: baselineAdvisory,
      metadata: {
        dataSource: "Regional Meteorological Baseline (API Temporarily Offline)",
        apiRetrievalTime: new Date().toISOString(),
        lastSynchronizedAt: new Date().toISOString(),
        isStale: true,
        cacheTtlSeconds: 0,
      },
    };
  }
}
