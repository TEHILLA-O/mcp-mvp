import type { Frequency, Indicator, Store } from "@/lib/data/types";
import { suggestIndicators } from "@/lib/data/queries";

export interface Interpretation {
  tool: "get_statistics" | "compare_statistics" | "get_geographic_comparison" | "calculate_trend";
  arguments: Record<string, unknown>;
  explanation: string;
  chartHint: "time" | "map" | "compare" | "trend";
}

export interface InterpretationFailure {
  message: string;
  suggestions: Array<{ id: string; name: string }>;
}

const NOT_IN_LIBRARY = ["unemployment", "labour", "labor", "employment", "population", "import", "export", "trade", "capital importation", "poverty"];

export function interpretQuestion(store: Store, question: string): Interpretation | InterpretationFailure {
  const text = question.trim().toLowerCase();
  if (!text) return { message: "Enter a question about a loaded series.", suggestions: store.indicators.slice(0, 4).map(brief) };

  const missingTopic = NOT_IN_LIBRARY.find((topic) => text.includes(topic));
  if (missingTopic && !text.includes("inflation") && !text.includes("gdp") && !text.includes("price")) {
    return {
      message: `The library does not include a published ${missingTopic} series. No figure has been estimated.`,
      suggestions: store.indicators.filter((item) => item.geographyLevel === "country").slice(0, 6).map(brief),
    };
  }

  const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  const indicator = matchIndicator(store, text);
  if (!indicator) {
    return {
      message: "That question did not match a loaded indicator.",
      suggestions: suggestIndicators(store, text).slice(0, 6).map(brief),
    };
  }

  const wantsMap = /state|states|fct|which state|highest|lowest|map|geographic/.test(text);
  const stateIndicator = wantsMap ? stateVariant(store, indicator) : null;
  if (wantsMap) {
    if (!stateIndicator) {
      return {
        message: `${indicator.name} has no state breakdown in the loaded tables.`,
        suggestions: store.indicators.filter((item) => item.geographyLevel === "state").map(brief),
      };
    }
    const periods = [
      ...new Set(store.observations.filter((item) => item.indicatorId === stateIndicator.id).map((item) => item.period)),
    ].sort();
    const period = periods[periods.length - 1];
    return {
      tool: "get_geographic_comparison",
      arguments: { indicator: stateIndicator.id, period, geography_level: "state" },
      explanation: `State comparison uses ${stateIndicator.name} for ${period}, the latest period with a published state breakdown.`,
      chartHint: "map",
    };
  }

  const compareIds = matchMany(store, text);
  if (compareIds.length >= 2 && /compare|versus|vs\b|against/.test(text)) {
    const compared = store.indicators.find((item) => item.id === compareIds[0]) ?? indicator;
    const [start, end] = rangeFor(compared, years, store);
    return {
      tool: "compare_statistics",
      arguments: {
        indicators: compareIds,
        start_period: start,
        end_period: end,
        geography: "nga",
        comparison_type: "overlay",
      },
      explanation: `Comparing ${compareIds.join(" and ")} because they share a methodology group.`,
      chartHint: "compare",
    };
  }

  const [start, end] = rangeFor(indicator, years, store);
  if (/trend|change|growth rate|how much/.test(text) && !/show|chart|plot/.test(text)) {
    return {
      tool: "calculate_trend",
      arguments: { indicator: indicator.id, start_period: start, end_period: end, geography: "nga" },
      explanation: `Trend for ${indicator.name} from ${start} to ${end}.`,
      chartHint: "trend",
    };
  }

  return {
    tool: "get_statistics",
    arguments: {
      indicator: indicator.id,
      start_period: start,
      end_period: end,
      geography: "nga",
      frequency: indicator.frequency,
    },
    explanation: `${indicator.name}, ${frequencyLabel(indicator.frequency)}, ${start} to ${end}.`,
    chartHint: "time",
  };
}

function brief(item: Indicator): { id: string; name: string } {
  return { id: item.id, name: item.name };
}

function frequencyLabel(frequency: Frequency): string {
  if (frequency === "monthly") return "monthly";
  if (frequency === "quarterly") return "quarterly";
  return "annual";
}

function matchIndicator(store: Store, text: string): Indicator | undefined {
  const national = store.indicators.filter((item) => item.geographyLevel === "country");
  if (/food inflation|food price/.test(text)) return national.find((item) => item.id === "cpi.food.yoy");
  if (/core inflation/.test(text)) return national.find((item) => item.id === "cpi.core.yoy");
  if (/month.on.month|monthly inflation/.test(text)) return national.find((item) => item.id === "cpi.all_items.mom");
  if (/food index/.test(text)) return national.find((item) => item.id === "cpi.food.index");
  if (/share|composition|contribution/.test(text) && /gdp|sector/.test(text)) return national.find((item) => item.id === "gdp.share.services.quarterly");
  if (/agriculture/.test(text) && /gdp|growth/.test(text)) return national.find((item) => item.id === "gdp.real.growth.agriculture.quarterly");
  if (/industr/.test(text) && /gdp|growth/.test(text)) return national.find((item) => item.id === "gdp.real.growth.industries.quarterly");
  if (/services/.test(text) && /gdp|growth/.test(text)) return national.find((item) => item.id === "gdp.real.growth.services.quarterly");
  if (/annual/.test(text) && /gdp|growth/.test(text)) return national.find((item) => item.id === "gdp.real.growth.annual");
  if (/gdp|economic growth|output/.test(text)) {
    return /annual|year/.test(text) && !/quarter/.test(text)
      ? national.find((item) => item.id === "gdp.real.growth.annual")
      : national.find((item) => item.id === "gdp.real.growth.quarterly");
  }
  if (/index/.test(text) && /price|cpi|inflation/.test(text)) return national.find((item) => item.id === "cpi.all_items.index");
  if (/inflation|cpi|price/.test(text)) return national.find((item) => item.id === "cpi.all_items.yoy");
  const suggested = suggestIndicators(store, text).find((item) => item.geographyLevel === "country");
  return suggested;
}

function matchMany(store: Store, text: string): string[] {
  const ids: string[] = [];
  if (/headline|inflation|cpi/.test(text)) ids.push("cpi.all_items.yoy");
  if (/food/.test(text)) ids.push("cpi.food.yoy");
  if (/core/.test(text)) ids.push("cpi.core.yoy");
  if (/agriculture/.test(text)) ids.push("gdp.real.growth.agriculture.quarterly");
  if (/industr/.test(text)) ids.push("gdp.real.growth.industries.quarterly");
  if (/services/.test(text)) ids.push("gdp.real.growth.services.quarterly");
  if (/gdp/.test(text) && !/agriculture|industr|services/.test(text)) ids.push("gdp.real.growth.quarterly");
  const unique = [...new Set(ids)];
  const group = unique.map((id) => store.indicators.find((item) => item.id === id)?.comparableGroup);
  if (new Set(group).size > 1) return [];
  return unique;
}

function stateVariant(store: Store, indicator: Indicator): Indicator | undefined {
  if (indicator.id === "cpi.all_items.yoy" || indicator.id === "cpi.all_items.yoy.state") {
    return store.indicators.find((item) => item.id === "cpi.all_items.yoy.state");
  }
  if (indicator.id.includes("index")) return store.indicators.find((item) => item.id === "cpi.all_items.index.state");
  return store.indicators.find((item) => item.geographyLevel === "state" && item.comparableGroup.includes("yoy"));
}

function rangeFor(indicator: Indicator, years: number[], store: Store): [string, string] {
  const periods = [...new Set(store.observations.filter((item) => item.indicatorId === indicator.id && item.geographyId === "nga").map((item) => item.period))].sort();
  const first = periods[0] ?? "1996-01";
  const last = periods[periods.length - 1] ?? first;
  if (years.length >= 2) {
    const startYear = Math.min(...years);
    const endYear = Math.max(...years);
    return [clampPeriod(first, last, startBound(indicator.frequency, startYear), true), clampPeriod(first, last, endBound(indicator.frequency, endYear), false)];
  }
  if (years.length === 1) {
    const year = years[0] ?? 2020;
    return [clampPeriod(first, last, startBound(indicator.frequency, year), true), clampPeriod(first, last, endBound(indicator.frequency, year), false)];
  }
  if (indicator.frequency === "monthly") return [clampPeriod(first, last, "2018-01", true), last];
  return [first, last];
}

function startBound(frequency: Frequency, year: number): string {
  if (frequency === "monthly") return `${year}-01`;
  if (frequency === "quarterly") return `${year}-Q1`;
  return String(year);
}

function endBound(frequency: Frequency, year: number): string {
  if (frequency === "monthly") return `${year}-12`;
  if (frequency === "quarterly") return `${year}-Q4`;
  return String(year);
}

function clampPeriod(first: string, last: string, requested: string, isStart: boolean): string {
  if (requested < first) return first;
  if (requested > last) return last;
  if (!isStart && requested > last) return last;
  return requested;
}

export function isFailure(value: Interpretation | InterpretationFailure): value is InterpretationFailure {
  return !("tool" in value);
}
