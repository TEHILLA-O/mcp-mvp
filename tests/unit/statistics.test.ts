import { describe, expect, it } from "vitest";
import { cellNumber } from "@/lib/data/ingestion/cells";
import { alignSeries, calculateTrend, StatError } from "@/lib/statistics/analyze";
import type { SeriesPoint } from "@/lib/data/types";

const point = (period: string, value: number): SeriesPoint => ({
  period,
  value,
  geographyId: "nga",
  unit: "percent",
  publicationTitle: "Fixture",
  sourceUrl: "https://example.test",
  retrievedAt: "2026-01-01T00:00:00.000Z",
  revisionId: "fixture",
});

describe("calculations", () => {
  it("reports percentage points for a rate and refuses a zero denominator", () => {
    const trend = calculateTrend([point("2024-01", 10), point("2024-02", 12.5)], "percent", "Headline inflation");
    expect(trend.percentagePointChange).toBe(2.5);
    expect(trend.percentChange).toBe(25);
    expect(trend.explanation).toContain("percentage points");

    const zero = calculateTrend([point("2024-01", 0), point("2024-02", 4)], "percent", "Headline inflation");
    expect(zero.percentChange).toBeNull();
    expect(zero.notes.some((note) => note.includes("zero"))).toBe(true);
  });

  it("uses index percent change and keeps negative values", () => {
    const trend = calculateTrend(
      [
        { ...point("2024-Q1", 100), unit: "index" },
        { ...point("2024-Q2", 90), unit: "index" },
      ],
      "index",
      "CPI",
    );
    expect(trend.absoluteChange).toBe(-10);
    expect(trend.percentChange).toBe(-10);
    expect(trend.minimum.value).toBe(90);
  });

  it("refuses a trend from a single point", () => {
    expect(() => calculateTrend([point("2024-01", 3)], "percent", "CPI")).toThrow(StatError);
  });

  it("does not turn blanks into zero", () => {
    expect(cellNumber(null)).toBeNull();
    expect(cellNumber("")).toBeNull();
    expect(cellNumber("-")).toBeNull();
    expect(cellNumber(0)).toBe(0);
  });

  it("leaves gaps empty when two series are differenced", () => {
    const aligned = alignSeries(
      [
        { indicatorId: "a", observations: [point("2024-01", 10), point("2024-03", 12)] },
        { indicatorId: "b", observations: [point("2024-01", 4)] },
      ],
      true,
    );
    expect(aligned.difference).toEqual([6, null]);
  });
});
