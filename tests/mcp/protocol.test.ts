import { describe, expect, it } from "vitest";
import { discoverTools, runTool } from "@/lib/mcp/client";

describe("MCP protocol", () => {
  it("discovers the statistics tools through the client", async () => {
    const tools = (await discoverTools()) as Array<{ name: string }>;
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "search_datasets",
        "get_statistics",
        "compare_statistics",
        "get_dataset_metadata",
        "list_indicators",
        "get_geographic_comparison",
        "calculate_trend",
        "get_available_periods",
      ]),
    );
  });

  it("returns the published September 2026 rate from get_statistics", async () => {
    const run = await runTool(
      "get_statistics",
      { indicator: "cpi.all_items.yoy", start_period: "2026-09", end_period: "2026-09", geography: "nga" },
      "test-headline",
    );
    expect(run.ok).toBe(true);
    expect(run.trace.tool).toBe("get_statistics");
    expect(run.trace.durationMs).toBeGreaterThanOrEqual(0);
    const result = run.result as { observations: Array<{ value: number; sourceUrl: string }> };
    expect(result.observations[0]?.value).toBeCloseTo(14.629617, 4);
    expect(result.observations[0]?.sourceUrl).toContain("nigerianstat.gov.ng");
  });

  it("rejects an unknown indicator and an invalid period without inventing data", async () => {
    const unknown = await runTool("get_statistics", { indicator: "unemployment.rate" }, "test-unknown");
    expect(unknown.ok).toBe(false);
    expect(JSON.stringify(unknown.result)).toContain("UNKNOWN_INDICATOR");

    const period = await runTool(
      "get_geographic_comparison",
      { indicator: "cpi.all_items.yoy.state", period: "1999-01", geography_level: "state" },
      "test-period",
    );
    expect(period.ok).toBe(false);
    expect(JSON.stringify(period.result)).toContain("INVALID_PERIOD");
  });
});
