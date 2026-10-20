import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  availablePeriods,
  compareStatistics,
  geographicComparison,
  getDataset,
  getStatistics,
  listIndicators,
  searchDatasets,
  trendFor,
  StatError,
} from "@/lib/data/queries";
import { getStore } from "@/lib/data/repository";

const period = z.string().regex(/^\d{4}(?:-\d{2}|-Q[1-4])?$/, "Use YYYY, YYYY-MM, or YYYY-Q1.");
const geography = z.string().min(2).max(80);

function failure(error: unknown) {
  const known = error instanceof StatError ? error : null;
  if (!known) console.error(error);
  const message = known?.message ?? "The statistics service could not complete that request.";
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
    structuredContent: {
      error: {
        code: known?.code ?? "INTERNAL",
        message,
        details: known?.details ?? null,
      },
    },
  };
}

function ok(payload: unknown, summary: string) {
  return {
    content: [{ type: "text" as const, text: summary }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_datasets",
      {
        title: "Search datasets",
        description: "Search the official NBS datasets loaded into Gazette. Returns catalogue metadata, not estimated figures.",
        inputSchema: z.object({
          query: z.string().max(200).optional(),
          category: z.string().max(80).optional(),
          geography: z.string().max(80).optional(),
          limit: z.number().int().min(1).max(50).optional(),
        }),
      },
      async ({ query, category, geography: geo, limit }) => {
        try {
          const store = await getStore();
          const datasets = searchDatasets(store, query, category, geo, limit ?? 20).map((dataset) => ({
            datasetId: dataset.id,
            name: dataset.name,
            description: dataset.description,
            category: dataset.category,
            geographicCoverage: dataset.geography,
            availablePeriod: { start: dataset.periodStart, end: dataset.periodEnd },
            indicators: dataset.indicatorIds,
            sourceUrl: dataset.sourceUrl,
            publicationTitle: dataset.publicationTitle,
            limitations: dataset.limitations,
          }));
          return ok({ datasets }, `${datasets.length} dataset${datasets.length === 1 ? "" : "s"} matched.`);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "get_statistics",
      {
        title: "Get statistics",
        description: "Retrieve published statistical observations for one indicator, period window and geography. Missing values are omitted.",
        inputSchema: z.object({
          indicator: z.string().min(2).max(120),
          start_period: period.optional(),
          end_period: period.optional(),
          geography: geography.optional(),
          frequency: z.enum(["monthly", "quarterly", "annual"]).optional(),
        }),
      },
      async ({ indicator, start_period, end_period, geography: geo, frequency }) => {
        try {
          const store = await getStore();
          const result = getStatistics(store, {
            indicator,
            startPeriod: start_period,
            endPeriod: end_period,
            geography: geo,
            frequency,
          });
          return ok(
            result,
            `${result.observations.length} observations of ${result.indicator.name} (${result.unit}).`,
          );
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "compare_statistics",
      {
        title: "Compare statistics",
        description: "Compare indicators that share a unit and methodology group, or compare geographies on one state-level indicator. Incompatible units are rejected.",
        inputSchema: z.object({
          indicators: z.array(z.string().min(2).max(120)).min(1).max(6),
          start_period: period.optional(),
          end_period: period.optional(),
          geography: z.union([geography, z.array(geography).min(1).max(12)]).optional(),
          comparison_type: z.enum(["overlay", "difference", "geographies"]),
        }),
      },
      async ({ indicators, start_period, end_period, geography: geo, comparison_type }) => {
        try {
          const store = await getStore();
          const result = compareStatistics(store, {
            indicators,
            startPeriod: start_period,
            endPeriod: end_period,
            geography: geo,
            comparisonType: comparison_type,
          });
          return ok(result, `Comparison (${comparison_type}) returned ${result.series.length} series.`);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "get_dataset_metadata",
      {
        title: "Dataset metadata",
        description: "Return description, indicators, sources, methodology, coverage and revision notes for one dataset.",
        inputSchema: z.object({ dataset_id: z.string().min(2).max(80) }),
      },
      async ({ dataset_id }) => {
        try {
          const store = await getStore();
          const dataset = getDataset(store, dataset_id);
          return ok(dataset, dataset.name);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "list_indicators",
      {
        title: "List indicators",
        description: "List statistical indicators loaded from NBS publications, with units and methodology groups.",
        inputSchema: z.object({
          category: z.string().max(80).optional(),
          search: z.string().max(200).optional(),
        }),
      },
      async ({ category, search }) => {
        try {
          const store = await getStore();
          const indicators = listIndicators(store, category, search).map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            unit: item.unit,
            unitKind: item.unitKind,
            frequency: item.frequency,
            geographyLevel: item.geographyLevel,
            comparableGroup: item.comparableGroup,
            datasetId: item.datasetId,
            methodology: item.methodology,
          }));
          return ok({ indicators }, `${indicators.length} indicators.`);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "get_geographic_comparison",
      {
        title: "Geographic comparison",
        description: "Compare Nigerian states for one period where a state-level series is actually published. Missing states are listed and are not zero.",
        inputSchema: z.object({
          indicator: z.string().min(2).max(120),
          period,
          geography_level: z.literal("state"),
        }),
      },
      async ({ indicator, period: selected, geography_level }) => {
        try {
          const store = await getStore();
          const result = geographicComparison(store, indicator, selected, geography_level);
          return ok(result, `${result.rows.length} states for ${result.period}.`);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "calculate_trend",
      {
        title: "Calculate trend",
        description: "Calculate absolute change, percentage-point change and percent change from published observations. Zero denominators are reported instead of invented rates.",
        inputSchema: z.object({
          indicator: z.string().min(2).max(120),
          start_period: period.optional(),
          end_period: period.optional(),
          geography: geography.optional(),
        }),
      },
      async ({ indicator, start_period, end_period, geography: geo }) => {
        try {
          const store = await getStore();
          const result = trendFor(store, { indicator, startPeriod: start_period, endPeriod: end_period, geography: geo });
          return ok(result, result.explanation);
        } catch (error) {
          return failure(error);
        }
      },
    );

    server.registerTool(
      "get_available_periods",
      {
        title: "Available periods",
        description: "List periods and the native frequency for an indicator so clients do not offer unpublished selections.",
        inputSchema: z.object({
          indicator: z.string().min(2).max(120),
          geography: geography.optional(),
        }),
      },
      async ({ indicator, geography: geo }) => {
        try {
          const store = await getStore();
          const result = availablePeriods(store, indicator, geo);
          return ok(result, `${result.periods.length} ${result.frequency} periods.`);
        } catch (error) {
          return failure(error);
        }
      },
    );
  },
  {
    serverInfo: { name: "gazette-nbs", version: "1.0.0" },
    instructions:
      "Gazette exposes published National Bureau of Statistics tables for Nigeria. Do not infer observations that these tools do not return. Inflation rates, index levels, GDP growth and GDP shares are different series.",
  },
);
