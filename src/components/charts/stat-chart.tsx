"use client";

import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatObservation } from "@/lib/statistics/analyze";
import type { ChartType } from "@/lib/visualization/recommend";

export interface ChartSeries {
  id: string;
  label: string;
  unit: string;
  points: Array<{ period: string; value: number | null }>;
}

const LIGHT = ["#0c6e56", "#8d5e24", "#2f5573", "#a33b32"];
const GLOW = ["#3dff9a", "#7dffe0", "#d6ff4a", "#49e0ff"];

export function StatChart({
  series,
  type,
  label,
  compact = false,
}: {
  series: ChartSeries[];
  type: ChartType;
  label: string;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const glow = resolvedTheme !== "light";
  const colors = glow ? GLOW : LIGHT;
  const gid = useId().replace(/:/g, "");
  const ink = glow ? "#e9fff4" : "#1c1915";
  const muted = glow ? "#7f9c8c" : "#5f584e";
  const grid = glow ? "#16362c" : "#e3d9c8";
  const animate = !reduce;
  const rows = pivot(series);
  const unit = series[0]?.unit ?? "";

  if (type === "kpi") {
    const point = series[0]?.points.at(-1);
    return (
      <div className="flex h-full min-h-64 flex-col justify-end p-6">
        <p className="font-serif text-6xl tracking-tight">{point ? formatObservation(point.value ?? 0, unit) : "—"}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{point ? `Latest published period ${point.period}` : "No observation"}</p>
      </div>
    );
  }

  if (type === "donut") {
    const latest = series.map((item) => ({ name: item.label, value: item.points.at(-1)?.value ?? 0 })).filter((item) => item.value !== null);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={latest} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} isAnimationActive={animate} paddingAngle={2}>
            {latest.map((item, index) => (
              <Cell key={item.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatObservation(Number(value), unit)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter" && series.length >= 2) {
    const left = series[0];
    const right = series[1];
    const data = (left?.points ?? [])
      .map((point) => {
        const match = right?.points.find((item) => item.period === point.period);
        if (point.value === null || match?.value === null || match?.value === undefined) return null;
        return { x: point.value, y: match.value, period: point.period };
      })
      .filter((item): item is { x: number; y: number; period: string } => item !== null);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid stroke={grid} />
          <XAxis dataKey="x" name={left?.label} stroke={muted} tick={{ fill: muted, fontSize: 12 }} type="number" />
          <YAxis dataKey="y" name={right?.label} stroke={muted} tick={{ fill: muted, fontSize: 12 }} type="number" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill={colors[0]} isAnimationActive={animate} name={`${left?.label} vs ${right?.label}`} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  const horizontal = type === "horizontal-bar";
  const Chart = type === "line" ? LineChart : type === "area" ? AreaChart : BarChart;
  const category = horizontal ? (
    <YAxis dataKey="period" type="category" width={92} stroke={muted} tick={{ fill: muted, fontSize: 11 }} />
  ) : (
    <XAxis dataKey="period" stroke={muted} tick={{ fill: muted, fontSize: 11 }} interval="preserveStartEnd" />
  );
  const values = horizontal ? (
    <XAxis type="number" stroke={muted} tick={{ fill: muted, fontSize: 11 }} />
  ) : (
    <YAxis stroke={muted} tick={{ fill: muted, fontSize: 11 }} width={56} />
  );

  return (
    <div className={compact ? "h-full min-h-0" : "h-full min-h-72"} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={rows} layout={horizontal ? "vertical" : "horizontal"}>
          {glow && (
            <defs>
              <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3dff9a" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#3dff9a" stopOpacity={0} />
              </linearGradient>
              <filter id={`glow-${gid}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}
          <CartesianGrid stroke={grid} vertical={false} />
          {category}
          {values}
          <Tooltip
            formatter={(value, name) => [value === null || value === undefined ? "Not published" : formatObservation(Number(value), unit), String(name)]}
            contentStyle={{ background: glow ? "#07140f" : "var(--paper-2)", border: "1px solid #1f6b45", color: ink, borderRadius: 12 }}
          />
          {!compact && <Legend />}
          {series.map((item, index) =>
            type === "area" ? (
              <Area key={item.id} type="monotone" dataKey={item.id} name={item.label} stroke={colors[index % colors.length]} fill={glow ? `url(#fill-${gid})` : colors[index % colors.length]} fillOpacity={glow ? 1 : 0.16} strokeWidth={2} filter={glow ? `url(#glow-${gid})` : undefined} isAnimationActive={animate} connectNulls={false} />
            ) : type === "line" ? (
              <Line key={item.id} type="monotone" dataKey={item.id} name={item.label} stroke={colors[index % colors.length]} strokeWidth={2.25} dot={false} filter={glow ? `url(#glow-${gid})` : undefined} isAnimationActive={animate} connectNulls={false} />
            ) : (
              <Bar key={item.id} dataKey={item.id} name={item.label} fill={colors[index % colors.length]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={animate} stackId={type === "stacked-bar" ? "share" : undefined} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

function pivot(series: ChartSeries[]) {
  const periods = [...new Set(series.flatMap((item) => item.points.map((point) => point.period)))].sort();
  return periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    for (const item of series) row[item.id] = item.points.find((point) => point.period === period)?.value ?? null;
    return row;
  });
}

export function seriesFromStatistics(id: string, label: string, unit: string, observations: Array<{ period: string; value: number }>): ChartSeries {
  return { id, label, unit, points: observations.map((item) => ({ period: item.period, value: item.value })) };
}
