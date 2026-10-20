import type { SeriesPoint, UnitKind } from "@/lib/data/types";

export interface TrendResult {
  startPeriod: string;
  endPeriod: string;
  startValue: number;
  endValue: number;
  absoluteChange: number;
  percentagePointChange: number | null;
  percentChange: number | null;
  periodOverPeriod: number | null;
  previousPeriod: string | null;
  minimum: { period: string; value: number };
  maximum: { period: string; value: number };
  average: number;
  observationCount: number;
  missingInSpan: number | null;
  explanation: string;
  notes: string[];
}

export class StatError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "StatError";
  }
}

export function calculateTrend(points: SeriesPoint[], unitKind: UnitKind, indicatorName: string): TrendResult {
  const ordered = [...points].filter((point) => Number.isFinite(point.value)).sort((a, b) => a.period.localeCompare(b.period));
  if (ordered.length < 2) {
    throw new StatError("INSUFFICIENT_DATA", "At least two published observations are required to calculate a trend.", {
      count: ordered.length,
    });
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];
  if (!first || !last || !previous) throw new StatError("INSUFFICIENT_DATA", "Observations were empty after sorting.");

  const absoluteChange = round4(last.value - first.value);
  const periodOverPeriod = round4(last.value - previous.value);
  const notes = [
    "Missing observations are excluded. They are not treated as zero.",
    "The start and end are the first and last published points inside the requested window, which may be inside the window rather than exactly on its edges.",
  ];

  let percentagePointChange: number | null = null;
  let percentChange: number | null = null;
  if (unitKind === "percent" || unitKind === "share") {
    percentagePointChange = absoluteChange;
    percentChange = changeRatio(first.value, last.value, notes);
    notes.push("The series is already a percent rate. The primary change is in percentage points. A relative percent change of that rate is reported separately and is not a change in the underlying index.");
  } else {
    percentChange = changeRatio(first.value, last.value, notes);
    notes.push("Percent change is (end − start) / |start| × 100.");
  }

  const average = round4(ordered.reduce((sum, point) => sum + point.value, 0) / ordered.length);
  const minimum = ordered.reduce((best, point) => (point.value < best.value ? point : best), first);
  const maximum = ordered.reduce((best, point) => (point.value > best.value ? point : best), first);
  const direction = absoluteChange > 0 ? "increased" : absoluteChange < 0 ? "decreased" : "was unchanged";
  const unitPhrase =
    unitKind === "index"
      ? `${formatNumber(absoluteChange)} index points (${percentChange === null ? "percent change undefined" : `${formatNumber(percentChange)} percent`})`
      : `${formatNumber(absoluteChange)} percentage points`;

  return {
    startPeriod: first.period,
    endPeriod: last.period,
    startValue: first.value,
    endValue: last.value,
    absoluteChange,
    percentagePointChange,
    percentChange,
    periodOverPeriod,
    previousPeriod: previous.period,
    minimum: { period: minimum.period, value: minimum.value },
    maximum: { period: maximum.period, value: maximum.value },
    average,
    observationCount: ordered.length,
    missingInSpan: null,
    explanation: `${indicatorName} ${direction} from ${formatNumber(first.value)} in ${first.period} to ${formatNumber(last.value)} in ${last.period}, a change of ${unitPhrase}. This describes the published series only.`,
    notes,
  };
}

function changeRatio(start: number, end: number, notes: string[]): number | null {
  if (start === 0) {
    notes.push("Percent change was not calculated because the starting value is zero.");
    return null;
  }
  return round4(((end - start) / Math.abs(start)) * 100);
}

export function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
}

export function formatObservation(value: number, unit: string): string {
  if (unit === "percent" || unit.startsWith("percent")) return `${formatNumber(value)}%`;
  return formatNumber(value);
}

export interface AlignedComparison {
  periods: string[];
  series: Array<{ indicatorId: string; points: Array<number | null> }>;
  difference: Array<number | null> | null;
  warning: string | null;
}

export function alignSeries(series: Array<{ indicatorId: string; observations: SeriesPoint[] }>, difference: boolean): AlignedComparison {
  const periodSet = new Set<string>();
  for (const item of series) for (const point of item.observations) periodSet.add(point.period);
  const periods = [...periodSet].sort();
  const aligned = series.map((item) => {
    const lookup = new Map(item.observations.map((point) => [point.period, point.value]));
    return { indicatorId: item.indicatorId, points: periods.map((period) => lookup.get(period) ?? null) };
  });
  let diff: Array<number | null> | null = null;
  let warning: string | null = null;
  if (difference) {
    if (aligned.length !== 2) {
      throw new StatError("INCOMPATIBLE_SERIES", "A difference needs exactly two series.");
    }
    const [left, right] = aligned;
    if (!left || !right) throw new StatError("INCOMPATIBLE_SERIES", "A difference needs exactly two series.");
    diff = periods.map((_, index) => {
      const a = left.points[index];
      const b = right.points[index];
      if (a === null || a === undefined || b === null || b === undefined) return null;
      return round4(a - b);
    });
    warning = "Difference is calculated only for periods where both series are published. Gaps stay empty.";
  }
  return { periods, series: aligned, difference: diff, warning };
}
