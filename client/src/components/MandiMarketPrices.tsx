/**
 * ProcureFlow AGMARKNET Live Mandi Market Prices & Modal Comparison
 * Displays official daily market arrival records, modal price comparisons,
 * difference/percentage change calculations, and historical price charts.
 */

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, Building2, Calendar, Database, Search } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { apiUrl } from "@/lib/api";

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
  trend: "UP" | "DOWN" | "STABLE" | "NO_PREVIOUS";
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
}

export const MandiMarketPrices: React.FC<MandiMarketPricesProps> = ({
  initialCommodity = "Paddy",
  initialState = "Andhra Pradesh",
  initialDistrict = "Guntur",
  onSelectPrice,
}) => {
  const [commodity, setCommodity] = useState<string>(initialCommodity);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<MandiPriceRecord[]>([]);
  const [comparison, setComparison] = useState<MandiPriceComparison | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>("");
  const [dataSource, setDataSource] = useState<string>("");

  const fetchMandiPrices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (commodity) params.set("commodity", commodity);
      if (district) params.set("district", district);

      const res = await fetch(apiUrl(`/market-prices?${params.toString()}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setRecords(data.records || []);
      setComparison(data.comparison || null);
      setLastSync(data.lastSynchronizedAt || new Date().toISOString());
      setDataSource(data.dataSource || "AGMARKNET");
      if (data.records?.length > 0 && !selectedRecordId) {
        setSelectedRecordId(data.records[0].id);
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

  const activeRecord = records.find(r => r.id === selectedRecordId) || records[0];

  return (
    <div className="mandi-prices-container rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-4">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Government Mandi Reporting
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800">
              Official AGMARKNET Daily Prices
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#143e2a] dark:text-emerald-100 mt-1">
            Live Agricultural Mandi Market Rates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified spot market arrivals reported by Agricultural Market Committees (APMC)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-foreground cursor-pointer"
          >
            <option value="Paddy">Paddy (Dhan)</option>
            <option value="Maize">Maize (Makka)</option>
            <option value="Cotton">Cotton (Kapas)</option>
            <option value="Bengal Gram">Bengal Gram (Chana)</option>
            <option value="Chilli">Dry Red Chillies</option>
          </select>

          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-foreground cursor-pointer"
          >
            <option value="Guntur">Guntur District</option>
            <option value="NTR">NTR / Vijayawada</option>
            <option value="Kurnool">Kurnool District</option>
            <option value="Nalgonda">Nalgonda (Miryalaguda)</option>
            <option value="Warangal">Warangal District</option>
          </select>

          <button
            onClick={fetchMandiPrices}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Refresh prices"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs font-bold text-muted-foreground gap-2">
            <RefreshCw size={15} className="animate-spin text-emerald-600" />
            Synchronizing AGMARKNET daily mandi records…
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No mandi records found for {commodity} in {district}. Try selecting another commodity.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Modal Price Highlight & Comparison Card */}
            {comparison && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/80">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      {comparison.market} · {comparison.commodity} ({comparison.variety})
                    </span>
                    <div className="flex items-baseline gap-3 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#113824] dark:text-emerald-200">
                        ₹{comparison.latest.modalPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">per Quintal (Modal)</span>

                      {/* Comparison Badge */}
                      {comparison.trend !== "NO_PREVIOUS" && (
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            comparison.trend === "UP"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                              : comparison.trend === "DOWN"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {comparison.trend === "UP" ? <TrendingUp size={13} /> : comparison.trend === "DOWN" ? <TrendingDown size={13} /> : <Minus size={13} />}
                          <span>
                            {comparison.difference > 0 ? `+₹${comparison.difference}` : `-₹${Math.abs(comparison.difference)}`} ({comparison.percentageChange > 0 ? `+${comparison.percentageChange}%` : `${comparison.percentageChange}%`})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <span>Daily Range: <b>₹{comparison.latest.minPrice}</b> – <b>₹{comparison.latest.maxPrice}</b></span>
                      {comparison.previous && (
                        <span>Previous Session: <b>₹{comparison.previous.modalPrice}</b> ({comparison.previous.arrivalDate})</span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="text-right text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 justify-end">
                      <Calendar size={13} className="text-emerald-600" />
                      <span>Market Reporting Date: <b>{comparison.latest.arrivalDate}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 justify-end text-[11px]">
                      <Database size={12} />
                      <span>Source: {comparison.metadata.dataSource.split("(")[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Stale Warning Indicator if applicable */}
                {comparison.isStale && comparison.staleWarning && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                    <span>{comparison.staleWarning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Historical Modal Price Chart */}
            {comparison?.historicalPrices && comparison.historicalPrices.length >= 2 && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-600" />
                    <span>Mandi Modal Price Trend (Historical Daily Sessions)</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">₹ / Quintal</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparison.historicalPrices} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e293b",
                          borderColor: "#334155",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [`₹${val} / Qtl`, "Modal Rate"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="modalPrice"
                        stroke="#176B4A"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#176B4A" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Daily Mandi Records Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Mandi / Market Yard</th>
                    <th className="p-3">Commodity & Variety</th>
                    <th className="p-3">Arrival Date</th>
                    <th className="p-3">Min Rate</th>
                    <th className="p-3">Max Rate</th>
                    <th className="p-3 text-right">Modal Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer ${
                        selectedRecordId === r.id ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                      }`}
                      onClick={() => setSelectedRecordId(r.id)}
                    >
                      <td className="p-3 font-bold text-foreground flex items-center gap-2">
                        <Building2 size={13} className="text-emerald-700 shrink-0" />
                        <span>{r.market}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground">{r.commodity}</span>
                        <div className="text-[11px] text-muted-foreground">{r.variety}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {r.arrivalDate}
                      </td>
                      <td className="p-3 text-slate-500">₹{r.minPrice.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-slate-500">₹{r.maxPrice.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right font-extrabold text-foreground text-sm">
                        ₹{r.modalPrice.toLocaleString("en-IN")}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/ qtl</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compliance Footer */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800 gap-2">
              <span>
                <b>Data Integrity:</b> Sourced from official AGMARKNET daily reporting. Daily mandi closing quotes are never labeled as intraday live quotes.
              </span>
              <span>
                Last Synchronized: <b>{new Date(lastSync).toLocaleTimeString("en-IN")} IST</b>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MandiMarketPrices;
