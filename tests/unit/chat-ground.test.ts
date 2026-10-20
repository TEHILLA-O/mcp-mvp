import { describe, expect, it } from "vitest";
import { compactForModel, parseToolArguments, seriesFromResult } from "@/lib/llm/ground";

describe("chat grounding", () => {
  it("keeps a short observation list and truncates a long one", () => {
    const short = compactForModel({ observations: [{ period: "2026-09", value: 14.63 }] }) as { observations: unknown[] };
    expect(short.observations).toHaveLength(1);
    const long = compactForModel({ observations: Array.from({ length: 40 }, (_, index) => ({ period: `p${index}`, value: index })) }) as {
      observations: { count: number; omitted: number; last: unknown[] };
    };
    expect(long.observations.count).toBe(40);
    expect(long.observations.omitted).toBe(24);
    expect(long.observations.last).toHaveLength(16);
  });

  it("rejects arguments that are not an object", () => {
    expect(parseToolArguments("[]")).toBeNull();
    expect(parseToolArguments("not json")).toBeNull();
    expect(parseToolArguments('{"indicator":"cpi.all_items.yoy"}')).toEqual({ indicator: "cpi.all_items.yoy" });
  });

  it("reads a chart series only from numeric observations", () => {
    expect(seriesFromResult({ indicator: { shortName: "Headline" }, unit: "percent", observations: [{ period: "2026-09", value: 14.63 }] })?.label).toBe("Headline");
    expect(seriesFromResult({ observations: [{ period: "2026-09", value: null }] })).toBeNull();
  });
});
