import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { interpretQuestion, isFailure } from "@/lib/nl/interpret";
import { recommendChart } from "@/lib/visualization/recommend";
import type { Store } from "@/lib/data/types";

const store = JSON.parse(readFileSync("data/store.json", "utf8")) as Store;

describe("questions and charts", () => {
  it("maps an inflation question onto the published year-on series", () => {
    const result = interpretQuestion(store, "Show Nigeria's inflation trend from 2020 to 2025.");
    expect(isFailure(result)).toBe(false);
    if (isFailure(result)) return;
    expect(result.tool).toBe("get_statistics");
    expect(result.arguments.indicator).toBe("cpi.all_items.yoy");
    expect(result.arguments.start_period).toBe("2020-01");
    expect(String(result.arguments.end_period).startsWith("2025")).toBe(true);
  });

  it("does not invent unemployment", () => {
    const result = interpretQuestion(store, "Show the trend for unemployment in the available data.");
    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.message.toLowerCase()).toContain("unemployment");
  });

  it("recommends a line for two time series and refuses a donut", () => {
    const recommendation = recommendChart({
      seriesCount: 2,
      pointCount: 12,
      geographyLevel: "country",
      timeSeries: true,
      composition: false,
      singlePeriod: false,
    });
    expect(recommendation.type).toBe("line");
    expect(recommendation.allowed).not.toContain("donut");
  });

  it("allows a donut only for a one-period composition", () => {
    const recommendation = recommendChart({
      seriesCount: 3,
      pointCount: 1,
      geographyLevel: "country",
      timeSeries: false,
      composition: true,
      singlePeriod: true,
    });
    expect(recommendation.type).toBe("donut");
  });
});
