/**
 * ProcureFlow AGMARKNET Live Mandi Market Prices & Price Movement Interface
 * Displays official daily market arrival records, crop price comparison cards,
 * directional movement indicators (Increase, Decrease, Unchanged), and historical price charts.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Database,
  CheckCircle2,
  Filter,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiUrl } from "@/lib/api";
import { tUi, type Language } from "@/lib/translations";

export type PriceMovementType = "UP" | "DOWN" | "STABLE" | "NO_PREVIOUS";
export type PriceMovementLabel =
  | "Price Increased"
  | "Price Decreased"
  | "Price Unchanged"
  | "Previous price record not available";

export interface MandiPriceRecord {
  id: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  priceUnit: string;
  dataSource: string;
  isOfficialAgmarknet: boolean;
}

export interface MandiPriceComparison {
  commodity: string;
  variety: string;
  market: string;
  district: string;
  state: string;
  priceUnit: string;
  latest: {
    modalPrice: number;
    minPrice: number;
    maxPrice: number;
    arrivalDate: string;
  };
  previous: {
    modalPrice: number;
    minPrice: number;
    maxPrice: number;
    arrivalDate: string;
  } | null;
  difference: number;
  percentageChange: number;
  trend: PriceMovementType;
  movementLabel: PriceMovementLabel;
  historicalPrices: Array<{
    date: string;
    modalPrice: number;
    minPrice: number;
    maxPrice: number;
  }>;
  isStale: boolean;
  staleWarning: string | null;
  metadata: {
    dataSource: string;
    apiRetrievalTime: string;
    lastSynchronizedAt: string;
  };
}

export interface MandiMarketPricesProps {
  initialCommodity?: string;
  initialState?: string;
  initialDistrict?: string;
  onSelectPrice?: (record: any) => void;
  language?: Language;
}

export const MandiMarketPrices: React.FC<MandiMarketPricesProps> = ({
  initialCommodity = "Paddy",
  initialState = "Andhra Pradesh",
  initialDistrict = "ALL",
  onSelectPrice,
  language = "EN",
}) => {
  const t = (str: string) => tUi(str, language);
  const [commodity, setCommodity] = useState<string>(initialCommodity);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<MandiPriceRecord[]>([]);
  const [comparisons, setComparisons] = useState<MandiPriceComparison[]>([]);
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>("");
  const [dataSource, setDataSource] = useState<string>("");

  const fetchMandiPrices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (commodity && commodity !== "ALL") params.set("commodity", commodity);
      if (district && district !== "ALL") params.set("district", district);

      const res = await fetch(apiUrl(`/market-prices?${params.toString()}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const loadedRecords: MandiPriceRecord[] = data.records || [];
      const loadedComparisons: MandiPriceComparison[] = data.comparisons || [];

      setRecords(loadedRecords);
      setComparisons(loadedComparisons);
      setLastSync(data.lastSynchronizedAt || new Date().toISOString());
      setDataSource(data.dataSource || "AGMARKNET");

      // Auto-select first card if current selection is invalid
      if (loadedComparisons.length > 0) {
        const firstKey = `${loadedComparisons[0].market}::${loadedComparisons[0].commodity}::${loadedComparisons[0].variety}`;
        setSelectedCardKey((prev) => {
          const exists = loadedComparisons.some(
            (c) => `${c.market}::${c.commodity}::${c.variety}` === prev
          );
          return exists && prev ? prev : firstKey;
        });
      } else {
        setSelectedCardKey(null);
      }
    } catch (err: any) {
      console.warn("[Mandi Prices Component Error]", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMandiPrices();
  }, [commodity, district]);

  // Find currently active comparison card
  const activeComparison = useMemo(() => {
    if (!selectedCardKey) return comparisons[0] || null;
    return (
      comparisons.find(
        (c) => `${c.market}::${c.commodity}::${c.variety}` === selectedCardKey
      ) ||
      comparisons[0] ||
      null
    );
  }, [selectedCardKey, comparisons]);

  const handleSelectCard = (card: MandiPriceComparison) => {
    const key = `${card.market}::${card.commodity}::${card.variety}`;
    setSelectedCardKey(key);
    if (onSelectPrice) {
      onSelectPrice({
        commodity: card.commodity,
        variety: card.variety,
        market: card.market,
        district: card.district,
        modalPrice: card.latest.modalPrice,
        minPrice: card.latest.minPrice,
        maxPrice: card.latest.maxPrice,
        arrivalDate: card.latest.arrivalDate,
      });
    }
  };

  const formattedSyncTime = useMemo(() => {
    if (!lastSync) return "";
    try {
      const d = new Date(lastSync);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return lastSync;
    }
  }, [lastSync]);

  return (
    <div className="mandi-prices-container rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-6">
      {/* Platform Header */}
      <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Agricultural Market Analytics
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800">
                Official AGMARKNET Daily Prices
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                GoI Verified
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-[#0a1f33] dark:text-slate-50 tracking-tight mt-1.5">
              Crop Price Movement & Mandi Comparison
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Real-time daily modal price shifts across Agricultural Market Committees (APMC).
              Compares the latest market session against the preceding reporting day for identical commodities and varieties.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Filter size={13} className="text-emerald-700 dark:text-emerald-400" />
              <span>Filters:</span>
            </div>

            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-foreground shadow-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              aria-label="Filter by Commodity"
            >
              <option value="ALL">All Crops</option>
              <option value="Paddy">Paddy (Dhan)</option>
              <option value="Maize">Maize (Makka)</option>
              <option value="Cotton">Cotton (Kapas)</option>
              <option value="Bengal Gram">Bengal Gram (Chana)</option>
              <option value="Chilli">Dry Red Chillies</option>
            </select>

            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-foreground shadow-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              aria-label="Filter by District"
            >
              <option value="ALL">All Districts / Mandis</option>
              <option value="Guntur">Guntur District</option>
              <option value="NTR">NTR / Vijayawada</option>
              <option value="Kurnool">Kurnool District</option>
              <option value="Nandyal">Nandyal District</option>
              <option value="Nalgonda">Nalgonda (Miryalaguda)</option>
              <option value="Warangal">Warangal District</option>
              <option value="Khammam">Khammam District</option>
              <option value="Nizamabad">Nizamabad District</option>
            </select>

            <button
              onClick={fetchMandiPrices}
              disabled={loading}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs hover:bg-slate-50 transition"
              title="Refresh live AGMARKNET quotes"
              aria-label="Refresh live AGMARKNET quotes"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-xs font-bold text-muted-foreground gap-3">
            <RefreshCw size={22} className="animate-spin text-emerald-600" />
            <span>Synchronizing official AGMARKNET daily reporting sessions…</span>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
            <h4 className="text-sm font-bold text-foreground">No mandi comparisons available</h4>
            <p className="text-xs text-muted-foreground mt-1">
              No matching market reporting records were found for the selected commodity or district. Try adjusting your filter above.
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 1: PRICE COMPARISON CARDS GRID */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-emerald-700 dark:text-emerald-400" />
                  <h4 className="text-sm font-extrabold text-[#0a1f33] dark:text-slate-100 uppercase tracking-wider">
                    Price Comparison Cards ({comparisons.length} Mandi Markets)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Click any card to inspect historical trend & load into calculator
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisons.map((card) => {
                  const cardKey = `${card.market}::${card.commodity}::${card.variety}`;
                  const isSelected = activeComparison && `${activeComparison.market}::${activeComparison.commodity}::${activeComparison.variety}` === cardKey;

                  return (
                    <div
                      key={cardKey}
                      onClick={() => handleSelectCard(card)}
                      className={`relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer border ${
                        isSelected
                          ? "bg-white dark:bg-slate-900 border-emerald-600 dark:border-emerald-500 shadow-md ring-2 ring-emerald-600/30 dark:ring-emerald-400/20"
                          : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Top Header: Crop Name & Variety */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-slate-900 dark:text-white font-black text-base leading-snug tracking-tight">
                              {card.commodity}
                            </h5>
                            <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 mt-1">
                              Variety: {card.variety}
                            </span>
                          </div>

                          {/* Selected Checkmark Indicator */}
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 size={11} /> Selected
                            </span>
                          )}
                        </div>

                        {/* Mandi & District */}
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                          <Building2 size={13} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{card.market}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-5">
                          {card.district}, {card.state}
                        </div>
                      </div>

                      {/* Middle: Price Display & Movement Indicator */}
                      <div className="my-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Prices row */}
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              Current Modal Price
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                                ₹{card.latest.modalPrice.toLocaleString("en-IN")}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                /{card.priceUnit.replace("₹/", "")}
                              </span>
                            </div>
                          </div>

                          {/* Previous Price */}
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Previous Session
                            </span>
                            {card.previous ? (
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 line-through">
                                ₹{card.previous.modalPrice.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None</span>
                            )}
                          </div>
                        </div>

                        {/* Movement Badge */}
                        <div className="mt-3">
                          {card.trend === "UP" && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 font-extrabold shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs font-black">
                                <span className="text-sm font-black text-[#10B981]">↑</span>
                                <span>Price Increased</span>
                              </div>
                              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                                +₹{card.difference.toLocaleString("en-IN")} (+{card.percentageChange}%)
                              </span>
                            </div>
                          )}

                          {card.trend === "DOWN" && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-600 text-rose-950 dark:text-rose-100 font-extrabold shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs font-black">
                                <span className="text-sm font-black text-[#EF4444]">↓</span>
                                <span>Price Decreased</span>
                              </div>
                              <span className="text-xs font-black text-rose-900 dark:text-rose-200">
                                -₹{Math.abs(card.difference).toLocaleString("en-IN")} ({card.percentageChange}%)
                              </span>
                            </div>
                          )}

                          {card.trend === "STABLE" && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-extrabold shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs font-black">
                                <span className="text-sm font-black text-slate-600 dark:text-slate-300">→</span>
                                <span>Price Unchanged</span>
                              </div>
                              <span className="text-xs font-black">₹0.00 (0.00%)</span>
                            </div>
                          )}

                          {card.trend === "NO_PREVIOUS" && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span className="text-sm text-slate-500">•</span>
                                <span>Previous price record not available</span>
                              </div>
                              <span className="text-[11px] font-black">1st Session</span>
                            </div>
                          )}
                        </div>

                        {/* Daily Min - Max Range */}
                        <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span className="font-semibold">Daily Range:</span>
                          <span className="font-black text-slate-900 dark:text-white">
                            ₹{card.latest.minPrice.toLocaleString("en-IN")} – ₹{card.latest.maxPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Footer: Dates & Sync Time */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-500">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-emerald-700 shrink-0" />
                            <span>Latest Reporting Date:</span>
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                            {card.latest.arrivalDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400 shrink-0" />
                            <span>Previous Reporting Date:</span>
                          </span>
                          <span className="font-medium text-slate-600 dark:text-slate-400 font-mono">
                            {card.previous ? card.previous.arrivalDate : "Not recorded"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>API Synchronized:</span>
                          </span>
                          <span className="font-medium">
                            {formattedSyncTime} IST
                          </span>
                        </div>

                        {/* Stale Warning Indicator if applicable */}
                        {card.isStale && card.staleWarning && (
                          <div className="mt-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <AlertCircle size={11} className="shrink-0 text-amber-600" />
                            <span className="line-clamp-2">{card.staleWarning}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: INTERACTIVE HISTORICAL PRICE TREND CHART */}
            {activeComparison && (
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 size={16} className="text-emerald-700 dark:text-emerald-400" />
                      <h4 className="text-sm font-extrabold text-[#0a1f33] dark:text-slate-100">
                        Historical Modal Price Trend
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {activeComparison.market} · <b className="text-emerald-800 dark:text-emerald-300">{activeComparison.commodity}</b> ({activeComparison.variety})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Price Unit: {activeComparison.priceUnit}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Chronological Government APMC Daily Sessions
                    </span>
                  </div>
                </div>

                {activeComparison.historicalPrices && activeComparison.historicalPrices.length >= 2 ? (
                  <div className="h-60 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={activeComparison.historicalPrices}
                        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          stroke="#64748b"
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          stroke="#64748b"
                          tickFormatter={(val) => `₹${val}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            borderColor: "#334155",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                          }}
                          formatter={(val: any, name: any) => [
                            `₹${val.toLocaleString("en-IN")} / Quintal`,
                            name === "modalPrice"
                              ? "Modal Rate"
                              : name === "minPrice"
                              ? "Daily Minimum"
                              : "Daily Maximum",
                          ]}
                          labelFormatter={(label) => `Market Arrival Session: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="modalPrice"
                          name="modalPrice"
                          stroke="#176B4A"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#176B4A", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7, fill: "#0f172a", stroke: "#176B4A", strokeWidth: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                    <AlertCircle size={24} className="mx-auto text-slate-400 mb-2" />
                    <h5 className="text-xs font-bold text-foreground">
                      Historical price trend unavailable
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Only one official reporting session is currently on record for {activeComparison.commodity} ({activeComparison.variety}) at {activeComparison.market}.
                      Historical trend lines require at least two distinct daily reporting dates.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: ALL DAILY MANDI ARRIVALS TABLE */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  All Daily Mandi Arrivals ({records.length} Records)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Official APMC spot arrivals
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Mandi / Market Yard</th>
                      <th className="p-3">Commodity & Variety</th>
                      <th className="p-3">Arrival Date</th>
                      <th className="p-3">Min Rate</th>
                      <th className="p-3">Max Rate</th>
                      <th className="p-3 text-right">Modal Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-100 font-medium">
                    {records.map((r) => {
                      const isRowActive = activeComparison && activeComparison.market === r.market && activeComparison.commodity === r.commodity && activeComparison.variety === r.variety;
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                            isRowActive ? "bg-emerald-50/70 dark:bg-emerald-950/40" : ""
                          }`}
                          onClick={() => {
                            const match = comparisons.find(
                              (c) => c.market === r.market && c.commodity === r.commodity && c.variety === r.variety
                            );
                            if (match) handleSelectCard(match);
                          }}
                        >
                          <td className="p-3 font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                            <Building2 size={13} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                            <span>{r.market}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-950 dark:text-white">{r.commodity}</span>
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.variety}</div>
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold">
                            {r.arrivalDate}
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-bold">₹{r.minPrice.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-bold">₹{r.maxPrice.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right font-black text-slate-950 dark:text-white text-sm">
                            ₹{r.modalPrice.toLocaleString("en-IN")}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">/ qtl</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance & Data Integrity Footer */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-slate-200/80 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <Database size={13} className="text-emerald-700 shrink-0" />
                <span>
                  <b>Data Integrity:</b> Sourced from official AGMARKNET daily reporting sessions. Reporting dates reflect actual APMC arrival records, distinguished from the live API synchronization timestamp ({formattedSyncTime} IST).
                </span>
              </div>
              <span>
                Source: <b>{dataSource.split("(")[0]}</b>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MandiMarketPrices;
