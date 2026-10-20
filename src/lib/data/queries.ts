import { alignSeries, calculateTrend, StatError, type TrendResult } from "@/lib/statistics/analyze";
import type { Dataset, Frequency, Geography, Indicator, Observation, SeriesPoint, StatisticsResult, Store } from "@/lib/data/types";

export interface StatisticsQuery {
  indicator: string;
  startPeriod?: string;
  endPeriod?: string;
  geography?: string;
  frequency?: Frequency;
}

function indicatorById(store: Store, id: string): Indicator {
  const found = store.indicators.find((item) => item.id === id);
  if (!found) {
    const suggestions = suggestIndicators(store, id).slice(0, 5).map((item) => item.id);
    throw new StatError("UNKNOWN_INDICATOR", `No indicator named "${id}" is in the loaded NBS library.`, { suggestions });
  }
  return found;
}

function geographyById(store: Store, id: string): Geography {
  const found = store.geographies.find((item) => item.id === id || item.name.toLowerCase() === id.toLowerCase() || item.shapeName?.toLowerCase() === id.toLowerCase());
  if (!found) throw new StatError("UNKNOWN_GEOGRAPHY", `No geography named "${id}" is available.`, { examples: ["nga", "NG-LA", "Lagos"] });
  return found;
}

export function suggestIndicators(store: Store, search: string): Indicator[] {
  const needle = search.toLowerCase();
  return store.indicators
    .map((item) => ({ item, score: scoreIndicator(item, needle) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function scoreIndicator(item: Indicator, needle: string): number {
  if (!needle) return 1;
  const haystack = [item.id, item.name, item.shortName, item.description, ...item.aliases].join(" ").toLowerCase();
  if (haystack.includes(needle)) return 3;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits;
}

export function listIndicators(store: Store, category?: string, search?: string): Indicator[] {
  return store.indicators.filter((item) => {
    if (category && item.category !== category && item.comparableGroup !== category) return false;
    if (search && scoreIndicator(item, search.toLowerCase()) === 0) return false;
    return true;
  });
}

export function searchDatasets(store: Store, query?: string, category?: string, geography?: string, limit = 20): Dataset[] {
  const needle = query?.toLowerCase() ?? "";
  return store.datasets
    .filter((dataset) => {
      if (category && dataset.category !== category) return false;
      if (geography && !dataset.geography.toLowerCase().includes(geography.toLowerCase()) && geography !== "nga") return false;
      if (!needle) return true;
      return [dataset.name, dataset.description, dataset.category, dataset.publicationTitle].join(" ").toLowerCase().includes(needle);
    })
    .slice(0, limit);
}

export function getDataset(store: Store, datasetId: string): Dataset & { indicators: Indicator[]; revisions: Store["revisions"] } {
  const dataset = store.datasets.find((item) => item.id === datasetId);
  if (!dataset) throw new StatError("UNKNOWN_DATASET", `Dataset "${datasetId}" is not loaded.`, { available: store.datasets.map((item) => item.id) });
  return {
    ...dataset,
    indicators: store.indicators.filter((item) => item.datasetId === datasetId),
    revisions: store.revisions.filter((item) => item.datasetId === datasetId || dataset.indicatorIds.some((id) => store.indicators.find((indicator) => indicator.id === id)?.revisionId === item.id)),
  };
}

export function availablePeriods(store: Store, indicatorId: string, geography?: string): { frequency: Frequency; periods: string[]; geographyId: string } {
  const indicator = indicatorById(store, indicatorId);
  if (!geography && indicator.geographyLevel === "state") {
    return { frequency: indicator.frequency, periods: uniquePeriods(store, indicator.id, undefined), geographyId: "all-states" };
  }
  const geo = geographyById(store, geography ?? "nga");
  return { frequency: indicator.frequency, periods: uniquePeriods(store, indicator.id, geo.id), geographyId: geo.id };
}

function selectRevision(observations: Observation[], preferredRevision: string): Observation[] {
  const byPeriod = new Map<string, Observation[]>();
  for (const item of observations) {
    const list = byPeriod.get(item.period) ?? [];
    list.push(item);
    byPeriod.set(item.period, list);
  }
  const chosen: Observation[] = [];
  for (const [period, list] of byPeriod) {
    const distinct = new Set(list.map((item) => item.value));
    if (distinct.size > 1) {
      throw new StatError("INCOMPATIBLE_REVISION", `Period ${period} has conflicting published values across revisions and was not combined.`, {
        revisions: list.map((item) => ({ revisionId: item.revisionId, value: item.value, publicationTitle: item.publicationTitle })),
      });
    }
    chosen.push(list.find((item) => item.revisionId === preferredRevision) ?? list[0]!);
  }
  return chosen;
}

function uniquePeriods(store: Store, indicatorId: string, geographyId: string | undefined): string[] {
  const periods = store.observations
    .filter((item) => item.indicatorId === indicatorId && (geographyId === undefined || item.geographyId === geographyId))
    .map((item) => item.period);
  return [...new Set(periods)].sort();
}

export function getStatistics(store: Store, query: StatisticsQuery): StatisticsResult {
  const indicator = indicatorById(store, query.indicator);
  if (query.frequency && query.frequency !== indicator.frequency) {
    throw new StatError(
      "FREQUENCY_MISMATCH",
      `${indicator.name} is published at ${indicator.frequency} frequency. Gazette does not aggregate it into ${query.frequency} observations.`,
      { frequency: indicator.frequency },
    );
  }
  const geography = geographyById(store, query.geography ?? (indicator.geographyLevel === "country" ? "nga" : ""));
  if (indicator.geographyLevel === "country" && geography.level !== "country") {
    throw new StatError("NO_GEOGRAPHIC_SERIES", `${indicator.name} is a national series. State values are not estimated from it.`, {
      alternative: indicator.id === "cpi.all_items.yoy" ? "cpi.all_items.yoy.state" : indicator.id === "cpi.all_items.index" ? "cpi.all_items.index.state" : null,
    });
  }
  if (indicator.geographyLevel === "state" && geography.level !== "state") {
    throw new StatError("GEOGRAPHY_REQUIRED", `${indicator.name} varies by state. Choose a state or call get_geographic_comparison.`, {});
  }

  const pool = store.observations
    .filter((item) => item.indicatorId === indicator.id && item.geographyId === geography.id)
    .filter((item) => (!query.startPeriod || item.period >= query.startPeriod) && (!query.endPeriod || item.period <= query.endPeriod));
  const matched = selectRevision(pool, indicator.revisionId).sort((a, b) => a.period.localeCompare(b.period));

  const warnings: string[] = [];
  const allPeriods = uniquePeriods(store, indicator.id, geography.id);
  const first = allPeriods[0];
  const last = allPeriods[allPeriods.length - 1];
  if (query.startPeriod && first && query.startPeriod < first) {
    warnings.push(`The published series starts at ${first}. Earlier periods are absent, not zero.`);
  }
  if (query.endPeriod && last && query.endPeriod > last) {
    warnings.push(`The latest published period is ${last}. Later periods are not estimated.`);
  }
  if (matched.length === 0) {
    warnings.push("No published observation falls in that period window.");
  }
  if (matched.length > 800) {
    throw new StatError("RANGE_TOO_WIDE", "The requested window has more than 800 observations. Narrow the period.", { count: matched.length });
  }

  const observations: SeriesPoint[] = matched.map((item) => ({
    period: item.period,
    value: item.value,
    geographyId: item.geographyId,
    unit: item.unit,
    publicationTitle: item.publicationTitle,
    sourceUrl: item.sourceUrl,
    retrievedAt: item.retrievedAt,
    revisionId: item.revisionId,
  }));
  const sample = matched[matched.length - 1];
  return {
    indicator,
    geography,
    frequency: indicator.frequency,
    unit: indicator.unit,
    unitKind: indicator.unitKind,
    methodology: indicator.methodology,
    observations,
    warnings,
    retrievedAt: sample?.retrievedAt ?? null,
    sourceUrl: sample?.sourceUrl ?? store.datasets.find((item) => item.id === indicator.datasetId)?.sourceUrl ?? "",
    publicationTitle: sample?.publicationTitle ?? "",
    publicationDate: sample?.publicationDate ?? null,
  };
}

export function compareStatistics(
  store: Store,
  input: { indicators: string[]; startPeriod?: string; endPeriod?: string; geography?: string | string[]; comparisonType: "overlay" | "difference" | "geographies" },
) {
  if (input.comparisonType === "geographies") {
    const indicatorId = input.indicators[0];
    if (!indicatorId || input.indicators.length !== 1) {
      throw new StatError("INCOMPATIBLE_SERIES", "A geography comparison takes one indicator and two or more geographies.");
    }
    const geos = Array.isArray(input.geography) ? input.geography : String(input.geography ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (geos.length < 2) throw new StatError("GEOGRAPHY_REQUIRED", "Provide at least two states or geographies to compare.");
    const series = geos.map((geography) => {
      const result = getStatistics(store, { indicator: indicatorId, startPeriod: input.startPeriod, endPeriod: input.endPeriod, geography });
      return { indicator: result.indicator, geography: result.geography, observations: result.observations, unit: result.unit, methodology: result.methodology };
    });
    return {
      comparisonType: input.comparisonType,
      warning: "States are compared on the same published indicator, period and unit. Missing state-periods stay missing.",
      series,
      aligned: alignSeries(series.map((item) => ({ indicatorId: item.geography.id, observations: item.observations })), false),
    };
  }

  if (input.indicators.length < 2) throw new StatError("INCOMPATIBLE_SERIES", "Choose at least two indicators to compare.");
  const results = input.indicators.map((indicator) =>
    getStatistics(store, {
      indicator,
      startPeriod: input.startPeriod,
      endPeriod: input.endPeriod,
      geography: Array.isArray(input.geography) ? input.geography[0] : input.geography,
    }),
  );
  const group = results[0]?.indicator.comparableGroup;
  if (results.some((result) => result.indicator.comparableGroup !== group || result.unit !== results[0]?.unit || result.frequency !== results[0]?.frequency)) {
    throw new StatError(
      "INCOMPATIBLE_SERIES",
      "These series use different units, frequencies or statistical concepts. Gazette will not overlay them. Index levels, inflation rates, GDP growth and GDP shares are separate groups.",
      { groups: results.map((result) => ({ id: result.indicator.id, group: result.indicator.comparableGroup, unit: result.unit, frequency: result.frequency })) },
    );
  }
  const warning =
    input.comparisonType === "difference"
      ? "The difference is in the shared unit. For inflation rates that unit is percentage points."
      : "Overlay compares series that share a unit and methodology group. It does not imply that one series causes the other.";
  return {
    comparisonType: input.comparisonType,
    warning,
    series: results.map((result) => ({
      indicator: result.indicator,
      geography: result.geography,
      observations: result.observations,
      unit: result.unit,
      methodology: result.methodology,
      warnings: result.warnings,
    })),
    aligned: alignSeries(
      results.map((result) => ({ indicatorId: result.indicator.id, observations: result.observations })),
      input.comparisonType === "difference",
    ),
  };
}

export function geographicComparison(store: Store, indicatorId: string, period: string, geographyLevel: "state") {
  if (geographyLevel !== "state") throw new StatError("UNSUPPORTED_GEOGRAPHY", "Only state-level comparison is available.");
  const indicator = indicatorById(store, indicatorId);
  if (indicator.geographyLevel !== "state") {
    throw new StatError("NO_GEOGRAPHIC_SERIES", `${indicator.name} has no state breakdown in the loaded tables.`, {
      alternatives: store.indicators.filter((item) => item.geographyLevel === "state").map((item) => item.id),
    });
  }
  const rows = store.observations
    .filter((item) => item.indicatorId === indicator.id && item.period === period && item.revisionId === indicator.revisionId)
    .map((item) => {
      const geography = store.geographies.find((geo) => geo.id === item.geographyId);
      return {
        geographyId: item.geographyId,
        name: geography?.name ?? item.geographyId,
        shapeName: geography?.shapeName ?? null,
        value: item.value,
        unit: item.unit,
        period: item.period,
        sourceUrl: item.sourceUrl,
        publicationTitle: item.publicationTitle,
      };
    })
    .sort((a, b) => b.value - a.value);
  if (rows.length === 0) {
    const periods = uniquePeriods(store, indicator.id, undefined);
    throw new StatError("INVALID_PERIOD", `No state observations are published for ${period}.`, { periods });
  }
  const covered = new Set(rows.map((row) => row.geographyId));
  const missing = store.geographies.filter((geo) => geo.level === "state" && !covered.has(geo.id)).map((geo) => geo.name);
  return {
    indicator,
    period,
    unit: indicator.unit,
    methodology: indicator.methodology,
    rows,
    missing,
    note: missing.length ? "States without a published value are listed as missing and are not drawn as zero." : "All 36 states and the FCT have a published value for this period.",
  };
}

export function trendFor(store: Store, query: StatisticsQuery): TrendResult & { indicator: Indicator; geography: Geography; methodology: string; sourceUrl: string } {
  const series = getStatistics(store, query);
  const trend = calculateTrend(series.observations, series.unitKind, series.indicator.name);
  return { ...trend, indicator: series.indicator, geography: series.geography, methodology: series.methodology, sourceUrl: series.sourceUrl };
}

export { StatError };
