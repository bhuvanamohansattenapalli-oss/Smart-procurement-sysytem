import { describe, it, expect } from "vitest";
import {
  getMandiMarketPrices,
  calculateMandiPriceComparison,
  VERIFIED_AGMARKNET_DATA,
  type MandiPriceRecord,
} from "./services/marketPriceService";

describe("AGMARKNET Market Price Service & Price Comparison Suite", () => {
  it("fetches verified AGMARKNET prices for Paddy across primary mandis", async () => {
    const result = await getMandiMarketPrices({ commodity: "Paddy" });
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.dataSource).toContain("AGMARKNET");
    expect(result.comparison).toBeDefined();
  });

  it("calculates exact modal price difference and percentage change accurately", () => {
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
    }
  });

  it("handles negative price trend when modal price dropped", () => {
    const comparison = calculateMandiPriceComparison(VERIFIED_AGMARKNET_DATA, {
      commodity: "Bengal Gram",
      market: "Kurnool Agricultural Market Yard",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;

    expect(comparison.latest.modalPrice).toBe(5460);
    if (comparison.previous) {
      expect(comparison.previous.modalPrice).toBe(5500);
      expect(comparison.difference).toBe(-40);
      expect(comparison.percentageChange).toBeCloseTo(-0.73, 2);
      expect(comparison.trend).toBe("DOWN");
    }
  });

  it("safely handles single records without previous history without crashing", () => {
    const singleRecordList: MandiPriceRecord[] = [
      {
        id: "single-01",
        state: "Andhra Pradesh",
        district: "Guntur",
        market: "Isolated Mandi",
        commodity: "Paddy",
        variety: "Common",
        arrivalDate: "2026-10-31",
        minPrice: 2200,
        maxPrice: 2400,
        modalPrice: 2300,
        priceUnit: "₹/Quintal",
        dataSource: "AGMARKNET",
        isOfficialAgmarknet: true,
      },
    ];

    const comparison = calculateMandiPriceComparison(singleRecordList, {
      commodity: "Paddy",
      market: "Isolated Mandi",
    });

    expect(comparison).not.toBeNull();
    if (!comparison) return;
    expect(comparison.previous).toBeNull();
    expect(comparison.difference).toBe(0);
    expect(comparison.percentageChange).toBe(0);
    expect(comparison.trend).toBe("NO_PREVIOUS");
  });

  it("never compares records from different mandis as if they were the same market", () => {
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
});
