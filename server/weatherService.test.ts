import { describe, it, expect } from "vitest";
import {
  getLiveAgriculturalWeather,
  generateCropSellingAdvisory,
  mapWmoWeatherCode,
  resolveFarmerLocationCoordinates,
  DISTRICT_COORDINATES,
  VILLAGE_COORDINATES,
} from "./services/weatherService";

describe("Open-Meteo Weather Service & Agricultural Decision Support", () => {
  // 1. WMO WEATHER CODE MAPPING
  it("maps WMO weather codes accurately to agricultural conditions", () => {
    expect(mapWmoWeatherCode(0).condition).toBe("Clear Sky");
    expect(mapWmoWeatherCode(1).condition).toBe("Mainly Clear");
    expect(mapWmoWeatherCode(2).condition).toBe("Partly Cloudy");
    expect(mapWmoWeatherCode(61).condition).toBe("Light Rain");
    expect(mapWmoWeatherCode(65).condition).toBe("Heavy Rain");
    expect(mapWmoWeatherCode(95).condition).toBe("Thunderstorm");
  });

  // 2. COORDINATE RESOLUTION TESTS
  it("resolves exact farmer GPS coordinates when provided", () => {
    const loc = resolveFarmerLocationCoordinates({
      latitude: 16.3285,
      longitude: 80.3540,
      village: "Muppalapally",
    });
    expect(loc.source).toBe("EXACT_COORDINATES");
    expect(loc.lat).toBeCloseTo(16.3285, 4);
    expect(loc.lon).toBeCloseTo(80.3540, 4);
    expect(loc.locationName).toContain("Muppalapally Farm");
  });

  it("resolves village centroid coordinates for registered farmer villages", () => {
    const loc = resolveFarmerLocationCoordinates({
      village: "Muppalapally",
    });
    expect(loc.source).toBe("VILLAGE_CENTROID");
    expect(loc.lat).toBeCloseTo(16.3285, 4);
    expect(loc.lon).toBeCloseTo(80.3540, 4);
    expect(loc.locationName).toContain("Muppalapally Village, Guntur");
  });

  it("resolves district centroid for district queries without hardcoding Guntur", () => {
    const nzm = resolveFarmerLocationCoordinates({ district: "Nizamabad" });
    expect(nzm.district).toBe("Nizamabad");
    expect(nzm.lat).toBeCloseTo(18.6725, 3);
    expect(nzm.lon).toBeCloseTo(78.0941, 3);
    expect(nzm.state).toBe("Telangana");

    const knl = resolveFarmerLocationCoordinates({ district: "Kurnool" });
    expect(knl.district).toBe("Kurnool");
    expect(knl.lat).toBeCloseTo(15.8281, 3);
    expect(knl.lon).toBeCloseTo(78.0373, 3);
  });

  it("handles missing coordinates and unknown locations safely with fallback", () => {
    const fallback = resolveFarmerLocationCoordinates({});
    expect(fallback.district).toBe("Guntur");
    expect(fallback.lat).toBeDefined();
    expect(fallback.lon).toBeDefined();
  });

  // 3. WEATHER-BASED SELLING ADVISORY LOGIC
  it("calculates high risk advisory for heavy rainfall (>=60% or >=10mm)", () => {
    const advisory = generateCropSellingAdvisory({
      tempC: 28,
      humidity: 88,
      rainProbabilityMax: 75,
      rainfallMm: 18.5,
      windSpeedKmH: 22,
      cropType: "Paddy",
    });

    expect(advisory.harvestStatus).toBe("HIGH_RISK");
    expect(advisory.transportFeasibility).toBe("DELAY_DISPATCH");
    expect(advisory.moistureRiskLevel).toBe("HIGH");
    expect(advisory.recommendation).toContain("Transportation may be affected");
    expect(advisory.rationale).toContain("High rain probability (75%)");
    expect(advisory.disclaimer).toContain("Weather is a vital decision factor, but does not alone dictate crop selling dates");
  });

  it("calculates caution advisory for moderate rainfall (>=30% or >=2.5mm)", () => {
    const advisory = generateCropSellingAdvisory({
      tempC: 30,
      humidity: 70,
      rainProbabilityMax: 40,
      rainfallMm: 4.0,
      windSpeedKmH: 15,
      cropType: "Paddy",
    });

    expect(advisory.harvestStatus).toBe("CAUTION");
    expect(advisory.transportFeasibility).toBe("PROTECT_PRODUCE");
    expect(advisory.moistureRiskLevel).toBe("MODERATE");
    expect(advisory.recommendation).toContain("protect harvested produce");
  });

  it("calculates favorable advisory for elevated humidity (>=75%)", () => {
    const advisory = generateCropSellingAdvisory({
      tempC: 30,
      humidity: 80,
      rainProbabilityMax: 10,
      rainfallMm: 0,
      windSpeedKmH: 12,
      cropType: "Paddy",
    });

    expect(advisory.harvestStatus).toBe("FAVORABLE");
    expect(advisory.transportFeasibility).toBe("NORMAL");
    expect(advisory.moistureRiskLevel).toBe("MODERATE");
    expect(advisory.recommendation).toContain("High ambient humidity detected");
  });

  it("calculates optimal advisory for clear weather", () => {
    const advisory = generateCropSellingAdvisory({
      tempC: 32,
      humidity: 50,
      rainProbabilityMax: 5,
      rainfallMm: 0,
      windSpeedKmH: 12,
      cropType: "Paddy",
    });

    expect(advisory.harvestStatus).toBe("OPTIMAL");
    expect(advisory.transportFeasibility).toBe("NORMAL");
    expect(advisory.moistureRiskLevel).toBe("LOW");
    expect(advisory.recommendation).toContain("suitable for normal transportation");
  });

  // 4. LIVE OPEN-METEO API INTEGRATION
  it("retrieves live Open-Meteo weather report with all required current, hourly, and daily metrics", async () => {
    const report = await getLiveAgriculturalWeather({
      district: "Guntur",
      latitude: 16.3067,
      longitude: 80.4365,
      cropType: "Paddy",
    });

    expect(report).toBeDefined();
    expect(report.coordinates.latitude).toBeCloseTo(16.3067, 3);
    expect(report.coordinates.longitude).toBeCloseTo(80.4365, 3);

    // Current weather metrics
    expect(typeof report.current.temperatureC).toBe("number");
    expect(typeof report.current.feelsLikeC).toBe("number");
    expect(typeof report.current.humidityPercent).toBe("number");
    expect(typeof report.current.windSpeedKmH).toBe("number");
    expect(typeof report.current.weatherCode).toBe("number");
    expect(typeof report.current.weatherCondition).toBe("string");
    expect(typeof report.current.rainfallMm).toBe("number");
    expect(typeof report.current.hourlyPrecipitationProbability).toBe("number");

    // Hourly forecast metrics (24 hours)
    expect(report.hourlyForecast.length).toBeGreaterThanOrEqual(24);
    const firstHour = report.hourlyForecast[0];
    expect(firstHour.time).toBeTruthy();
    expect(typeof firstHour.temperatureC).toBe("number");
    expect(typeof firstHour.precipitationProbability).toBe("number");
    expect(typeof firstHour.precipitationAmountMm).toBe("number");
    expect(typeof firstHour.rainfallMm).toBe("number");
    expect(typeof firstHour.windSpeedKmH).toBe("number");
    expect(typeof firstHour.humidityPercent).toBe("number");

    // Daily forecast metrics (7 days)
    expect(report.dailyForecast.length).toBeGreaterThanOrEqual(7);
    const today = report.dailyForecast[0];
    expect(today.dayName).toBe("Today");
    expect(typeof today.tempHighC).toBe("number");
    expect(typeof today.tempLowC).toBe("number");
    expect(typeof today.maxPrecipitationProbability).toBe("number");
    expect(typeof today.totalRainfallMm).toBe("number");
    expect(typeof today.maxWindSpeedKmH).toBe("number");

    // Selling Advisory & Disclaimer
    expect(report.sellingAdvisory).toBeDefined();
    expect(report.sellingAdvisory.disclaimer).toContain("Weather is a vital decision factor");

    // Attribution
    expect(report.metadata.attribution).toBe("Weather data by Open-Meteo.com");
  });

  it("retrieves live Open-Meteo weather for different coordinates without hardcoding Guntur", async () => {
    // Nizamabad Coordinates
    const nzmReport = await getLiveAgriculturalWeather({
      district: "Nizamabad",
      latitude: 18.6725,
      longitude: 78.0941,
    });
    expect(nzmReport.district).toBe("Nizamabad");
    expect(nzmReport.coordinates.latitude).toBeCloseTo(18.6725, 3);
    expect(nzmReport.coordinates.longitude).toBeCloseTo(78.0941, 3);
    expect(typeof nzmReport.current.temperatureC).toBe("number");
  });

  it("retrieves live Open-Meteo weather for registered village (Muppalapally)", async () => {
    const vReport = await getLiveAgriculturalWeather({
      village: "Muppalapally",
    });
    expect(vReport.locationName).toContain("Muppalapally");
    expect(vReport.coordinates.latitude).toBeCloseTo(16.3285, 3);
    expect(vReport.coordinates.longitude).toBeCloseTo(80.3540, 3);
  });
});
