"use client";

import { useEffect, useState } from "react";
import { StatChart, type ChartSeries } from "@/components/charts/stat-chart";
import { useMcp } from "@/hooks/use-mcp";
import type { Indicator, SeriesPoint } from "@/lib/data/types";
import { recommendChart } from "@/lib/visualization/recommend";

interface ComparedSeries {
  indicator: Indicator;
  observations: SeriesPoint[];
  unit: string;
  warnings?: string[];
}

export function CompareView() {
  const { callTool } = useMcp();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [left, setLeft] = useState("cpi.all_items.yoy");
  const [right, setRight] = useState("cpi.food.yoy");
  const [series, setSeries] = useState<ComparedSeries[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void callTool("list_indicators", {}).then((body) => {
      const list = ((body.result as { indicators?: Indicator[] } | null)?.indicators ?? []).filter((item) => item.geographyLevel === "country");
      setIndicators(list);
    });
  }, [callTool]);

  useEffect(() => {
    const a = indicators.find((item) => item.id === left);
    const b = indicators.find((item) => item.id === right);
    if (a && b && (a.comparableGroup !== b.comparableGroup || a.unit !== b.unit)) {
      setError("Those series do not share a unit and methodology group, so they stay on separate charts.");
      setSeries([]);
      return;
    }
    void callTool("compare_statistics", {
      indicators: [left, right],
      comparison_type: "overlay",
      geography: "nga",
    }).then((body) => {
      if (!body.ok) {
        setError(body.text || "The comparison was rejected.");
        setSeries([]);
        return;
      }
      const payload = body.result as { series?: ComparedSeries[]; warning?: string };
      setError(null);
      setWarning(payload.warning ?? null);
      setSeries(payload.series ?? []);
    });
  }, [left, right, callTool, indicators]);

  const chartSeries: ChartSeries[] = series.map((item) => ({
    id: item.indicator.id,
    label: item.indicator.shortName,
    unit: item.unit,
    points: item.observations.map((point) => ({ period: point.period, value: point.value })),
  }));
  const share = series[0]?.indicator.unitKind === "share";
  const recommendation = recommendChart({
    seriesCount: chartSeries.length,
    pointCount: chartSeries[0]?.points.length ?? 0,
    geographyLevel: "country",
    timeSeries: true,
    composition: Boolean(share),
    singlePeriod: false,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">Compare</p>
        <h1 className="font-serif text-4xl sm:text-5xl">Same unit, or no chart.</h1>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Picker label="First series" value={left} onChange={setLeft} indicators={indicators} />
        <Picker label="Second series" value={right} onChange={setRight} indicators={indicators} />
      </div>
      {error && <p className="rounded-2xl border border-[var(--danger)] px-4 py-3 text-sm">{error}</p>}
      {warning && <p className="text-sm text-[var(--muted)]">{warning}</p>}
      {chartSeries.length > 0 && (
        <section className="surface h-[460px] rounded-3xl p-4">
          <StatChart type={recommendation.type} series={chartSeries} label={`Comparison of ${left} and ${right}`} />
        </section>
      )}
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  indicators,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  indicators: Indicator[];
}) {
  return (
    <label className="rounded-2xl border border-[var(--line)] px-3 py-2 text-sm">
      <span className="block text-xs text-[var(--muted)]">{label}</span>
      <select aria-label={label} className="w-full bg-transparent" value={value} onChange={(event) => onChange(event.target.value)}>
        {indicators.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.unit})
          </option>
        ))}
      </select>
    </label>
  );
}
