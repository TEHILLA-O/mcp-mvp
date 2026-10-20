export type ChartType = "line" | "area" | "bar" | "horizontal-bar" | "stacked-bar" | "scatter" | "donut" | "kpi";

export interface ChartRecommendation {
  type: ChartType;
  reason: string;
  allowed: ChartType[];
}

export interface ChartShape {
  seriesCount: number;
  pointCount: number;
  geographyLevel: "country" | "state" | "mixed";
  timeSeries: boolean;
  composition: boolean;
  singlePeriod: boolean;
}

/**
 * Deterministic chart rules:
 * 1. One observation becomes a KPI. A bar is the only other permitted view.
 * 2. One period and many states becomes a ranked bar. A map is a separate view. A line is refused.
 * 3. Shares that form one composition become a stacked bar. A donut is allowed only for a single period.
 * 4. Exactly two aligned time series may be shown as a scatter plot. It is not the default.
 * 5. One time series defaults to an area chart. Line and bar remain available.
 * 6. Several time series default to a line chart. Multi-series area charts are refused because overlapping areas imply a total.
 * 7. Pie and donut charts are refused unless the values are shares of one whole for one period.
 */
export function recommendChart(shape: ChartShape): ChartRecommendation {
  if (shape.pointCount <= 1 && shape.seriesCount <= 1) {
    return { type: "kpi", reason: "A single published observation is shown as a figure, with its period, rather than as a chart with an invented trend.", allowed: ["kpi", "bar"] };
  }
  if (shape.geographyLevel === "state" && shape.singlePeriod) {
    return {
      type: "horizontal-bar",
      reason: "One period across states is a ranking. A line would invent a time order the table does not have.",
      allowed: ["horizontal-bar", "bar"],
    };
  }
  if (shape.composition && shape.singlePeriod) {
    return {
      type: "donut",
      reason: "These shares describe one period and sum to the published total, so a donut is a composition rather than a time series.",
      allowed: ["donut", "stacked-bar", "horizontal-bar"],
    };
  }
  if (shape.composition) {
    return {
      type: "stacked-bar",
      reason: "Sector shares are parts of real GDP. A stacked bar keeps the whole visible across quarters.",
      allowed: ["stacked-bar", "line", "bar"],
    };
  }
  if (shape.timeSeries && shape.seriesCount === 1) {
    return { type: "area", reason: "A single time series is drawn as an area chart. Line and bar show the same observations.", allowed: ["area", "line", "bar"] };
  }
  if (shape.timeSeries && shape.seriesCount === 2) {
    return {
      type: "line",
      reason: "Two compatible time series are overlaid as lines. Scatter is available and uses period-aligned pairs only.",
      allowed: ["line", "bar", "scatter"],
    };
  }
  if (shape.timeSeries) {
    return { type: "line", reason: "Several compatible time series stay as lines so areas are not mistaken for a sum.", allowed: ["line", "bar"] };
  }
  return { type: "bar", reason: "The observations are categorical, so a bar chart is used.", allowed: ["bar", "horizontal-bar"] };
}

export function chartAllowed(recommendation: ChartRecommendation, requested: ChartType): boolean {
  return recommendation.allowed.includes(requested);
}
