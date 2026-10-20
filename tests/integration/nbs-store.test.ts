import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compareStatistics, getStatistics, StatError } from "@/lib/data/queries";
import type { Store } from "@/lib/data/types";

const store = JSON.parse(readFileSync("data/store.json", "utf8")) as Store;

describe("verified NBS snapshot", () => {
  it("keeps the September 2026 headline rate from the CPI workbook", () => {
    const series = getStatistics(store, { indicator: "cpi.all_items.yoy", startPeriod: "2026-09", endPeriod: "2026-09", geography: "nga" });
    expect(series.observations).toHaveLength(1);
    expect(series.observations[0]?.value).toBeCloseTo(14.629617, 4);
    expect(series.unit).toBe("percent");
    expect(series.publicationTitle).toContain("September 2026");
    expect(series.sourceUrl).toContain("microdata.nigerianstat.gov.ng");
  });

  it("keeps Q2 2026 real GDP growth separate from the CPI", () => {
    const series = getStatistics(store, { indicator: "gdp.real.growth.quarterly", startPeriod: "2026-Q2", endPeriod: "2026-Q2" });
    expect(series.observations[0]?.value).toBeCloseTo(4.434, 2);
    expect(() =>
      compareStatistics(store, {
        indicators: ["cpi.all_items.yoy", "gdp.real.growth.quarterly"],
        comparisonType: "overlay",
      }),
    ).toThrow(StatError);
  });

  it("publishes all 37 states for September 2026 and does not fill missing history", () => {
    const states = getStatistics(store, { indicator: "cpi.all_items.yoy.state", geography: "NG-LA", startPeriod: "2020-01", endPeriod: "2026-09" });
    expect(states.observations.map((item) => item.period)).toEqual(["2026-09"]);
    const lagos = states.observations[0];
    expect(lagos?.value).toBeGreaterThan(0);
    const all = store.observations.filter((item) => item.indicatorId === "cpi.all_items.yoy.state" && item.period === "2026-09");
    expect(new Set(all.map((item) => item.geographyId)).size).toBe(37);
  });

  it("includes annual real growth for 2020 from the rebasing tables and 2025 from the quarterly workbook", () => {
    const annual = getStatistics(store, { indicator: "gdp.real.growth.annual" });
    const years = annual.observations.map((item) => item.period);
    expect(years).toContain("2020");
    expect(years).toContain("2025");
    const year2020 = annual.observations.find((item) => item.period === "2020");
    expect(year2020?.value).toBeCloseTo(-6.955076, 3);
    expect(year2020?.publicationTitle).toContain("2019");
  });
});
