/**
 * Weather-Based Crop Selling Advisory Component
 * Provides agronomic decision support based on Open-Meteo precipitation probability,
 * rainfall volume, crop storage conditions, and transportation feasibility.
 *
 * NOTE: Weather is a vital operational factor, but does not alone dictate crop-selling decisions.
 */

import React, { useState } from "react";
import {
  CloudRain,
  AlertTriangle,
  ShieldCheck,
  Truck,
  Warehouse,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Sparkles,
} from "lucide-react";

export interface SellingAdvisoryData {
  title: string;
  recommendation: string;
  harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK";
  transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST";
  rationale: string;
  forecastPeriodUsed: string;
  storageAdvice: string;
  transportAdvice?: string;
  moistureRiskLevel: "LOW" | "MODERATE" | "HIGH";
  disclaimer?: string;
}

export interface WeatherSellingAdvisoryProps {
  weatherData?: any;
  advisory?: SellingAdvisoryData;
  district: string;
  temperatureC?: number;
  humidityPercent?: number;
  rainProbabilityMax?: number;
  rainfallMm?: number;
  windSpeedKmH?: number;
  onCropChange?: (crop: string) => void;
  selectedCrop?: string;
  onNavigateToBooking?: () => void;
  onNavigateToTransport?: () => void;
}

export const WeatherSellingAdvisory: React.FC<WeatherSellingAdvisoryProps> = ({
  weatherData,
  advisory,
  district,
  temperatureC,
  humidityPercent,
  rainProbabilityMax,
  rainfallMm,
  windSpeedKmH,
  onCropChange,
  selectedCrop = "Paddy",
  onNavigateToBooking,
  onNavigateToTransport,
}) => {
  const [cropStage, setCropStage] = useState<"HARVESTED" | "STANDING">("HARVESTED");
  const [storageType, setStorageType] = useState<"COVERED" | "OPEN_FIELD">("COVERED");

  const actualTemp = temperatureC ?? weatherData?.temperature ?? 31;
  const actualHumidity = humidityPercent ?? weatherData?.humidity ?? 60;
  const actualRainProb =
    rainProbabilityMax ??
    weatherData?.precipitationChance ??
    weatherData?.hourlyPrecipitationProbability ??
    10;
  const actualRainMm =
    rainfallMm ??
    weatherData?.rainfallMm ??
    weatherData?.openMeteo?.current?.rainfallMm ??
    0;
  const actualWind = windSpeedKmH ?? weatherData?.windSpeedKmH ?? 14;
  const actualAdvisory: SellingAdvisoryData | undefined =
    advisory ?? weatherData?.sellingAdvisory ?? weatherData?.openMeteo?.sellingAdvisory;

  const status =
    actualAdvisory?.harvestStatus ||
    (actualRainProb >= 60 || actualRainMm >= 10
      ? "HIGH_RISK"
      : actualRainProb >= 30 || actualRainMm >= 2.5
      ? "CAUTION"
      : actualHumidity >= 75
      ? "FAVORABLE"
      : "OPTIMAL");

  const badgeStyles = {
    OPTIMAL:
      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
    FAVORABLE:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
    CAUTION:
      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
    HIGH_RISK:
      "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  }[status];

  return (
    <div className="weather-selling-advisory-widget rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              ProcureFlow Meteorological Decision Support
            </span>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeStyles}`}>
              {status === "OPTIMAL"
                ? "Optimal Harvesting & Selling Conditions"
                : status === "FAVORABLE"
                ? "Favorable Conditions (High Humidity)"
                : status === "CAUTION"
                ? "Caution Advised (Rain Forecasted)"
                : "High Rain Risk (Delay Transit)"}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#0a1f33] dark:text-emerald-100 mt-1">
            Weather-Based Selling Advisory
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Forecast Horizon: <b>{actualAdvisory?.forecastPeriodUsed || "Next 24 to 72 Hours"}</b> · Target Location: <b>{district}</b>
          </p>
        </div>

        {/* Quick Crop Selector */}
        {onCropChange && (
          <div className="flex items-center gap-2 text-xs font-semibold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-muted-foreground">Advisory Crop:</span>
            <select
              value={selectedCrop}
              onChange={(e) => onCropChange(e.target.value)}
              className="bg-transparent font-bold text-emerald-800 dark:text-emerald-300 focus:outline-hidden cursor-pointer"
              aria-label="Select Advisory Crop"
            >
              <option value="Paddy">Paddy (Common / Grade A)</option>
              <option value="Maize">Maize (Makka)</option>
              <option value="Cotton">Cotton (Kapas)</option>
              <option value="Bengal Gram">Bengal Gram (Chana)</option>
              <option value="Chillies">Dry Red Chillies</option>
            </select>
          </div>
        )}
      </div>

      {/* Advisory Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Core Recommendation Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shrink-0 mt-0.5">
              {status === "OPTIMAL" || status === "FAVORABLE" ? (
                <ShieldCheck size={22} className="text-emerald-700 dark:text-emerald-300" />
              ) : (
                <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-extrabold text-[#0a1f33] dark:text-slate-100">
                {actualAdvisory?.recommendation ||
                  "Weather conditions appear suitable for normal transportation."}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {actualAdvisory?.rationale ||
                  `Precipitation probability (${actualRainProb}%) and ambient temperature (${actualTemp}°C) present safe operational conditions for harvesting and dispatch.`}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Dimension Operational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Precipitation & Rain Impact */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <CloudRain size={16} className="text-sky-600" />
                <span>Precipitation Risk</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                {actualRainProb}% <span className="text-xs font-normal text-muted-foreground">probability</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Forecasted Rain: <b>{actualRainMm.toFixed(1)} mm</b>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {actualRainProb >= 50
                ? "Active rain likely. Delay field threshing."
                : actualRainProb >= 25
                ? "Isolated showers possible. Keep tarpaulins on hand."
                : "Minimal rain likelihood over next 24h."}
            </p>
          </div>

          {/* 2. Transportation Conditions */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <Truck size={16} className="text-emerald-600" />
                <span>Transit Feasibility</span>
              </div>
              <div className="text-xs font-bold text-foreground">
                {actualAdvisory?.transportAdvice ||
                  (actualRainProb >= 50
                    ? "Delay dispatch until active rain passes"
                    : actualRainProb >= 25
                    ? "Protect bags with heavy-gauge waterproof tarpaulin"
                    : "Normal transit permitted")}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              Wind Velocity: <b>{actualWind} km/h</b> · Smooth transit corridor.
            </p>
          </div>

          {/* 3. Storage & Moisture Risk */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Warehouse size={16} className="text-amber-600" />
                  <span>Storage Guard</span>
                </div>
                {/* Storage Toggle */}
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setStorageType("COVERED")}
                    className={`px-1.5 py-0.5 rounded ${
                      storageType === "COVERED"
                        ? "bg-emerald-700 text-white font-bold"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Covered
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageType("OPEN_FIELD")}
                    className={`px-1.5 py-0.5 rounded ${
                      storageType === "OPEN_FIELD"
                        ? "bg-amber-700 text-white font-bold"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Open Field
                  </button>
                </div>
              </div>
              <div className="text-xs font-bold text-foreground">
                {storageType === "OPEN_FIELD"
                  ? "Elevate bags on wooden pallets; double-tarp immediately."
                  : actualAdvisory?.storageAdvice || "Standard covered warehouse storage recommended."}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              Ambient Humidity: <b>{actualHumidity}%</b> (Govt MSP Limit: &lt;17%).
            </p>
          </div>

          {/* 4. Crop Readiness & Stage */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={16} className="text-teal-600" />
                  <span>Harvest Stage</span>
                </div>
                {/* Crop Stage Toggle */}
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCropStage("HARVESTED")}
                    className={`px-1.5 py-0.5 rounded ${
                      cropStage === "HARVESTED"
                        ? "bg-emerald-700 text-white font-bold"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Harvested
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropStage("STANDING")}
                    className={`px-1.5 py-0.5 rounded ${
                      cropStage === "STANDING"
                        ? "bg-teal-700 text-white font-bold"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Standing
                  </button>
                </div>
              </div>
              <div className="text-xs font-bold text-foreground">
                {cropStage === "HARVESTED"
                  ? "Sun-dry grain during peak noon hours to meet 17% moisture limit."
                  : "Safe for combine harvester operations during dry daylight hours."}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              Target Crop: <b>{selectedCrop}</b>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {onNavigateToTransport && (
              <button
                type="button"
                onClick={onNavigateToTransport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-xs transition"
              >
                <Truck size={14} /> Book Subsidized Transport for This Window
              </button>
            )}
            {onNavigateToBooking && (
              <button
                type="button"
                onClick={onNavigateToBooking}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition"
              >
                <Calendar size={14} /> Book Mandi Procurement Slot
              </button>
            )}
          </div>
        </div>

        {/* Strict Agricultural Advisory Disclaimer */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
          <Info size={15} className="shrink-0 text-slate-500 mt-0.5" />
          <p className="leading-relaxed">
            <b>Important Agronomic Advisory Notice:</b> {actualAdvisory?.disclaimer ||
              "Weather conditions are a critical operational consideration, but do not alone dictate the best crop-selling date. Farmers should simultaneously evaluate APMC mandi modal price trends, government MSP announcements, moisture thresholds (<17% for Grade A paddy), transport availability, and storage capacity before scheduling their dispatch."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeatherSellingAdvisory;
