/**
 * Weather-Based Crop Selling Advisory Component
 * Provides agronomic decision support based on Open-Meteo precipitation probability,
 * rainfall volume, crop stage, and transport conditions.
 */

import React, { useState } from "react";
import { CloudRain, AlertTriangle, ShieldCheck, Truck, Warehouse, Info, ChevronDown, CheckCircle2 } from "lucide-react";

export interface SellingAdvisoryData {
  title: string;
  recommendation: string;
  harvestStatus: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK";
  transportFeasibility: "NORMAL" | "PROTECT_PRODUCE" | "DELAY_DISPATCH" | "RECHECK_FORECAST";
  rationale: string;
  forecastPeriodUsed: string;
  storageAdvice: string;
  moistureRiskLevel: "LOW" | "MODERATE" | "HIGH";
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
  const actualRainProb = rainProbabilityMax ?? weatherData?.precipitationChance ?? 10;
  const actualRainMm = rainfallMm ?? weatherData?.openMeteo?.current?.precipitationMm ?? 0;
  const actualWind = windSpeedKmH ?? weatherData?.windSpeedKmH ?? 14;
  const actualAdvisory: SellingAdvisoryData | undefined = advisory ?? weatherData?.sellingAdvisory;

  const status = actualAdvisory?.harvestStatus || (actualRainProb >= 50 ? "CAUTION" : "OPTIMAL");

  const badgeStyles = {
    OPTIMAL: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
    FAVORABLE: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
    CAUTION: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
    HIGH_RISK: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  }[status];

  return (
    <div className="weather-selling-advisory-widget rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-4">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              ProcureFlow Agricultural Intelligence
            </span>
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeStyles}`}>
              {status === "OPTIMAL" ? "Optimal Conditions" : status === "FAVORABLE" ? "Favorable" : status === "CAUTION" ? "Caution Advised" : "High Rain Risk"}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#143d2b] dark:text-emerald-100 mt-1">
            Weather-Based Selling Advisory
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forecast Period: {actualAdvisory?.forecastPeriodUsed || "Next 24 to 72 Hours"} · Location: <b>{district}</b>
          </p>
        </div>

        {/* Quick Crop Selector */}
        {onCropChange && (
          <div className="flex items-center gap-2 text-xs font-semibold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-muted-foreground">Crop:</span>
            <select
              value={selectedCrop}
              onChange={(e) => onCropChange(e.target.value)}
              className="bg-transparent font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none cursor-pointer"
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

      {/* Advisory Recommendation Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Core Recommendation Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shrink-0 mt-0.5">
              {status === "OPTIMAL" || status === "FAVORABLE" ? <ShieldCheck size={20} /> : <AlertTriangle size={20} className="text-amber-600" />}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-foreground">
                {actualAdvisory?.recommendation || "Weather conditions appear suitable for normal transportation."}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {actualAdvisory?.rationale || `Moderate rain probability (${actualRainProb}%) and ambient temperature (${actualTemp}°C) present safe transit conditions. Produce moisture remains stable.`}
              </p>
            </div>
          </div>
        </div>

        {/* Grid of Actionable Advisory Dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Transportation Conditions */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Truck size={15} className="text-emerald-600" />
              <span>Transportation Feasibility</span>
            </div>
            <div className="text-xs font-bold text-foreground">
              {actualRainProb >= 50
                ? "Transportation may be affected by expected rainfall. Recheck before dispatch."
                : actualRainProb >= 25
                ? "Rain is forecast; protect produce with waterproof covers."
                : "Suitable for normal transit."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rain Chance: <b>{actualRainProb}%</b> · Expected Rain: <b>{actualRainMm.toFixed(1)} mm</b>
            </p>
          </div>

          {/* 2. Storage & Moisture Risk */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Warehouse size={15} className="text-amber-600" />
              <span>Storage & Moisture Guard</span>
            </div>
            <div className="text-xs font-bold text-foreground">
              {actualAdvisory?.storageAdvice || "Ensure multi-layer tarpaulin coverage on open field threshing floors."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Ambient Humidity: <b>{actualHumidity}%</b> (MSP standard &lt; 17%)
            </p>
          </div>

          {/* 3. Crop Stage Readiness */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <CheckCircle2 size={15} className="text-teal-600" />
              <span>Crop Status & Bagging</span>
            </div>
            <div className="text-xs font-bold text-foreground">
              {cropStage === "HARVESTED"
                ? "Harvested grain: Sun-dry thoroughly prior to procurement weighbridge."
                : "Standing crop: Safe for combine harvester operations during dry hours."}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setCropStage("HARVESTED")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cropStage === "HARVESTED" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
              >
                Harvested
              </button>
              <button
                type="button"
                onClick={() => setCropStage("STANDING")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cropStage === "STANDING" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
              >
                Standing
              </button>
            </div>
          </div>
        </div>

        {/* Advisory Disclaimer & Compliance Note */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Info size={13} className="shrink-0 text-slate-400" />
          <span>
            Advisory grounds decisions strictly on precipitation and humidity factors. ProcureFlow never makes unsupported price trend guarantees or mandates selling/holding solely based on rainfall.
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeatherSellingAdvisory;
