import { describe, it, expect } from "vitest";
import {
  getLiveAgriculturalWeather,
  generateCropSellingAdvisory,
  mapWmoWeatherCode,
  DISTRICT_COORDINATES,
} from "./services/weatherService";

describe("Open-Meteo Weather Service & Selling Advisory Tests", () => {
  it("maps WMO weather codes accurately to agricultural conditions", () => {
    expect(mapWmoWeatherCode(0).condition).toBe("Clear Sky");
    expect(mapWmoWeatherCode(61).condition).toBe("Light Rain");
    expect(mapWmoWeatherCode(95).condition).toBe("Thunderstorm");
  });

  it("calculates sound agricultural selling advisory for high rainfall", () => {
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
  });

  it("calculates sound agricultural selling advisory for optimal conditions", () => {
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

  it("retrieves live Open-Meteo weather report for Guntur district", async () => {
    const report = await getLiveAgriculturalWeather({ district: "Guntur" });

    expect(report).toBeDefined();
    expect(report.district).toContain("Guntur");
    expect(typeof report.current.temperatureC).toBe("number");
    expect(typeof report.current.humidityPercent).toBe("number");
    expect(typeof report.current.windSpeedKmH).toBe("number");
    expect(typeof report.current.hourlyPrecipitationProbability).toBe("number");
    expect(typeof report.daily.maxPrecipitationProbability).toBe("number");
    expect(report.sellingAdvisory).toBeDefined();
    expect(report.metadata.dataSource).toContain("Open-Meteo");
  });
});

