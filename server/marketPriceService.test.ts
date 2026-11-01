import { describe, it, expect } from "vitest";
import {
  getMandiMarketPrices,
  calculateMandiPriceComparison,
  calculateAllMandiPriceComparisons,
  getHistoricalCropPriceTrend,
  VERIFIED_AGMARKNET_DATA,
  type MandiPriceRecord,
} from "./services/marketPriceService";

describe("AGMARKNET Market Price Service & Price Comparison Suite", () => {
  it("fetches verified AGMARKNET prices for Paddy across primary mandis", async () => {
    const result = await getMandiMarketPrices({ commodity: "Paddy" });
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.dataSource).toContain("AGMARKNET");
    expect(result.comparison).toBeDefined();
    expect(result.comparisons.length).toBeGreaterThan(0);
    expect(result.lastSynchronizedAt).toBeDefined();
  });

  // SCENARIO 1: PRICE INCREASE
  it("calculates exact modal price difference, positive percentage change, and 'Price Increased' label", () => {
    const comparison = calculateMandiPriceComparison(VERIFIED_AGMARKNET_DATA, {
      commodity: "Paddy",
      market: "Guntur Agricultural Market Yard",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;

    expect(comparison.latest.modalPrice).toBe(2320);
    expect(comparison.previous).not.toBeNull();
    if (comparison.previous) {
      expect(comparison.previous.modalPrice).toBe(2300);
      expect(comparison.difference).toBe(20); // 2320 - 2300 = +20
      expect(comparison.percentageChange).toBeCloseTo(0.87, 2); // (20 / 2300) * 100 = 0.869%
      expect(comparison.trend).toBe("UP");
      expect(comparison.movementLabel).toBe("Price Increased");
    }
  });

  // SCENARIO 2: PRICE DECREASE
  it("handles negative price trend when modal price dropped with 'Price Decreased' label", () => {
    const comparison = calculateMandiPriceComparison(VERIFIED_AGMARKNET_DATA, {
      commodity: "Bengal Gram",
      market: "Kurnool Agricultural Market Yard",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;

    expect(comparison.latest.modalPrice).toBe(5460);
    if (comparison.previous) {
      expect(comparison.previous.modalPrice).toBe(5500);
      expect(comparison.difference).toBe(-40); // 5460 - 5500 = -40
      expect(comparison.percentageChange).toBeCloseTo(-0.73, 2); // (-40 / 5500) * 100 = -0.727%
      expect(comparison.trend).toBe("DOWN");
      expect(comparison.movementLabel).toBe("Price Decreased");
    }
  });

  // SCENARIO 3: PRICE UNCHANGED / STABLE
  it("handles unchanged price between reporting dates with 0 difference and 'Price Unchanged' label", () => {
    const comparison = calculateMandiPriceComparison(VERIFIED_AGMARKNET_DATA, {
      commodity: "Paddy",
      market: "Nizamabad Agricultural Market Yard",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;

    expect(comparison.latest.modalPrice).toBe(2320);
    expect(comparison.previous).not.toBeNull();
    if (comparison.previous) {
      expect(comparison.previous.modalPrice).toBe(2320);
      expect(comparison.difference).toBe(0);
      expect(comparison.percentageChange).toBe(0);
      expect(comparison.trend).toBe("STABLE");
      expect(comparison.movementLabel).toBe("Price Unchanged");
    }
  });

  // SCENARIO 4: MISSING PREVIOUS RECORD
  it("safely handles single records without previous history, labeling 'Previous price record not available'", () => {
    const comparison = calculateMandiPriceComparison(VERIFIED_AGMARKNET_DATA, {
      commodity: "Cotton",
      market: "Khammam APMC Yard",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;
    expect(comparison.previous).toBeNull();
    expect(comparison.difference).toBe(0);
    expect(comparison.percentageChange).toBe(0);
    expect(comparison.trend).toBe("NO_PREVIOUS");
    expect(comparison.movementLabel).toBe("Previous price record not available");
  });

  // SCENARIO 5: ZERO PREVIOUS PRICE EDGE CASE
  it("safely handles zero previous price without division-by-zero, NaN, or Infinity", () => {
    const zeroPreviousRecords: MandiPriceRecord[] = [
      {
        id: "zero-prev-01",
        state: "Andhra Pradesh",
        district: "Guntur",
        market: "Zero Test Market",
        commodity: "Maize",
        variety: "Hybrid",
        arrivalDate: "2026-10-31",
        minPrice: 2000,
        maxPrice: 2400,
        modalPrice: 2200,
        priceUnit: "₹/Quintal",
        dataSource: "AGMARKNET",
        isOfficialAgmarknet: true,
      },
      {
        id: "zero-prev-02",
        state: "Andhra Pradesh",
        district: "Guntur",
        market: "Zero Test Market",
        commodity: "Maize",
        variety: "Hybrid",
        arrivalDate: "2026-10-30",
        minPrice: 0,
        maxPrice: 0,
        modalPrice: 0, // previous session was reported as 0
        priceUnit: "₹/Quintal",
        dataSource: "AGMARKNET",
        isOfficialAgmarknet: true,
      },
    ];

    const comparison = calculateMandiPriceComparison(zeroPreviousRecords, {
      market: "Zero Test Market",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;
    expect(Number.isFinite(comparison.percentageChange)).toBe(true);
    expect(isNaN(comparison.percentageChange)).toBe(false);
    expect(comparison.difference).toBe(2200);
    expect(comparison.trend).toBe("UP");
    expect(comparison.movementLabel).toBe("Price Increased");
  });

  // SCENARIO 6: NO CROSS-MANDI POLLUTION
  it("never compares records from different mandis or varieties as if they were the same market", () => {
    const mixedList: MandiPriceRecord[] = [
      {
        id: "mandi-a",
        state: "Andhra Pradesh",
        district: "Guntur",
        market: "Market Yard Alpha",
        commodity: "Paddy",
        variety: "Common",
        arrivalDate: "2026-10-31",
        minPrice: 2200,
        maxPrice: 2400,
        modalPrice: 2350,
        priceUnit: "₹/Quintal",
        dataSource: "AGMARKNET",
        isOfficialAgmarknet: true,
      },
      {
        id: "mandi-b",
        state: "Andhra Pradesh",
        district: "Krishna",
        market: "Market Yard Beta",
        commodity: "Paddy",
        variety: "Common",
        arrivalDate: "2026-10-30",
        minPrice: 2100,
        maxPrice: 2300,
        modalPrice: 2200,
        priceUnit: "₹/Quintal",
        dataSource: "AGMARKNET",
        isOfficialAgmarknet: true,
      },
    ];

    const comparisonAlpha = calculateMandiPriceComparison(mixedList, { market: "Market Yard Alpha" });
    expect(comparisonAlpha?.market).toBe("Market Yard Alpha");
    expect(comparisonAlpha?.previous).toBeNull(); // Did NOT incorrectly take Market Yard Beta as previous!
  });

  // SCENARIO 7: MULTIPLE CARD GENERATION
  it("calculateAllMandiPriceComparisons returns comparison cards for all distinct crop/variety/mandi combinations", () => {
    const allComparisons = calculateAllMandiPriceComparisons(VERIFIED_AGMARKNET_DATA);
    expect(allComparisons.length).toBeGreaterThanOrEqual(5);

    // Verify each card has distinct and correct grouping
    for (const card of allComparisons) {
      expect(card.commodity).toBeTruthy();
      expect(card.market).toBeTruthy();
      expect(card.latest.modalPrice).toBeGreaterThan(0);
      expect(["UP", "DOWN", "STABLE", "NO_PREVIOUS"]).toContain(card.trend);
      expect([
        "Price Increased",
        "Price Decreased",
        "Price Unchanged",
        "Previous price record not available",
      ]).toContain(card.movementLabel);
    }
  });

  // SCENARIO 8: DATE SEPARATION
  it("clearly distinguishes market arrival reporting date from API last synchronization timestamp", async () => {
    const result = await getMandiMarketPrices({ commodity: "Paddy" });
    expect(result.comparison).not.toBeNull();
    if (!result.comparison) return;

    // Reporting dates are YYYY-MM-DD from government dataset
    expect(result.comparison.latest.arrivalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (result.comparison.previous) {
      expect(result.comparison.previous.arrivalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Sync timestamp is ISO 8601 with time
    expect(result.lastSynchronizedAt).toContain("T");
    expect(result.comparison.metadata.lastSynchronizedAt).toContain("T");
    expect(result.comparison.latest.arrivalDate).not.toEqual(result.lastSynchronizedAt);
  });

  // SCENARIO 9: 2-MONTH AVERAGE CROP PRICE TREND
  it("calculates 2-month date-grouped average modal price trend for Paddy accurately", () => {
    const trend = getHistoricalCropPriceTrend("Paddy");

    expect(trend).toBeDefined();
    expect(trend.commodity).toContain("Paddy");
    expect(trend.points.length).toBeGreaterThanOrEqual(8);
    expect(trend.startDate).toBe("2026-09-02");
    expect(trend.endDate).toBe("2026-10-31");
    expect(trend.coveragePeriod).toContain("Sep");
    expect(trend.coveragePeriod).toContain("Oct");

    // Chronological order check
    for (let i = 1; i < trend.points.length; i++) {
      const prevDate = new Date(trend.points[i - 1].date).getTime();
      const currDate = new Date(trend.points[i].date).getTime();
      expect(currDate).toBeGreaterThan(prevDate);
    }

    // Trend metrics
    expect(trend.latestPrice).toBeGreaterThan(trend.startPrice);
    expect(trend.absoluteChange).toBeGreaterThan(0);
    expect(trend.percentageChange).toBeGreaterThan(0);
    expect(trend.trend).toBe("UP");
    expect(trend.movementLabel).toBe("Price Increased");
    expect(trend.dataSource).toContain("AGMARKNET");
  });

  it("handles crops with decreasing trend like Bengal Gram with negative percentage and 'Price Decreased' label", () => {
    const trend = getHistoricalCropPriceTrend("Bengal Gram");

    expect(trend).toBeDefined();
    expect(trend.points.length).toBeGreaterThanOrEqual(5);
    expect(trend.trend).toBe("DOWN");
    expect(trend.movementLabel).toBe("Price Decreased");
    expect(trend.absoluteChange).toBeLessThan(0);
    expect(trend.percentageChange).toBeLessThan(0);
  });

  it("gracefully returns empty result structure with notice when crop has no records", () => {
    const trend = getHistoricalCropPriceTrend("NonExistentCropXYZ");

    expect(trend.points).toEqual([]);
    expect(trend.totalReportingSessions).toBe(0);
    expect(trend.trend).toBe("STABLE");
    expect(trend.movementLabel).toBe("Price Unchanged");
    expect(trend.coverageNotice).toContain("No historical");
  });
});
