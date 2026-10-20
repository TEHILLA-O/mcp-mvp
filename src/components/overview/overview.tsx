"use client";

import { ArrowUpRight, Landmark, Percent, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { StatChart, seriesFromStatistics } from "@/components/charts/stat-chart";
import { useInspector } from "@/components/inspector/provider";
import { formatObservation } from "@/lib/statistics/analyze";
import type { ToolRun } from "@/lib/mcp/trace";
import type { StatisticsResult } from "@/lib/data/types";
import type { TrendResult } from "@/lib/statistics/analyze";

export function Overview({ runs }: { runs: ToolRun[] }) {
  const { commit } = useInspector();
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    for (const run of runs) commit(run.trace);
  }, [runs, commit]);

  const headline = asStats(runs[0]);
  const food = asStats(runs[1]);
  const gdp = asStats(runs[2]);
  const trend = runs[3]?.ok ? (runs[3].result as TrendResult) : null;
  const core = asStats(runs[4]);
  const mom = asStats(runs[5]);
  const agri = asStats(runs[6]);
  const industry = asStats(runs[7]);
  const services = asStats(runs[8]);
  const latest = headline?.observations.at(-1);
  const previous = headline?.observations.at(-2);
  const sectors = [agri, industry, services].filter((item): item is StatisticsResult => item !== null);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full border border-[#1f9d4e]/50 bg-[#123224] text-[#3dff9a]">
            <Shield className="size-4" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/compare" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
            Compare
          </Link>
          <Link href="/geography" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
            Map
          </Link>
        </div>
      </header>

      <section className="grid gap-3 lg:grid-cols-[240px_minmax(0,1.35fr)_260px]">
        <div className="grid grid-cols-2 gap-3">
          <Kpi icon={<Percent className="size-4" />} label="Headline" value={pointText(headline)} hint={headline?.observations.at(-1)?.period ?? "—"} />
          <Kpi icon={<TrendingUp className="size-4" />} label="Food" value={pointText(food)} hint={food?.observations.at(-1)?.period ?? "—"} />
          <Kpi icon={<ArrowUpRight className="size-4" />} label="Core" value={pointText(core)} hint={core?.observations.at(-1)?.period ?? "—"} />
          <Kpi icon={<Percent className="size-4" />} label="Month on month" value={pointText(mom)} hint={mom?.observations.at(-1)?.period ?? "—"} />
        </div>
        <ChartCard
          title="Headline inflation"
          primary={latest ? formatObservation(latest.value, "percent") : "—"}
          secondary={previous ? formatObservation(previous.value, "percent") : ""}
          caption="Year-on change, all items. Base 2024."
        >
          {headline && (
            <StatChart compact type="area" label="Headline inflation from 2018 to the latest published month" series={[seriesFromStatistics("cpi", "Headline", headline.unit, headline.observations)]} />
          )}
        </ChartCard>
        <div className="grid gap-3">
          <ChartCard title="Food inflation" primary={pointText(food)} secondary={food?.observations.at(-1)?.period ?? ""} caption="Year-on change, food CPI.">
            <div className="h-28">
              {food && <StatChart compact type="area" label="Food inflation" series={[seriesFromStatistics("food", "Food", food.unit, food.observations)]} />}
            </div>
          </ChartCard>
          <StatRows
            rows={[
              ["Minimum", trend ? `${formatObservation(trend.minimum.value, "percent")} · ${trend.minimum.period}` : "—"],
              ["Maximum", trend ? `${formatObservation(trend.maximum.value, "percent")} · ${trend.maximum.period}` : "—"],
              ["Average", trend ? formatObservation(trend.average, "percent") : "—"],
              ["Observations", trend ? String(trend.observationCount) : "—"],
            ]}
          />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          <Kpi icon={<Landmark className="size-4" />} label="Real GDP growth" value={pointText(gdp)} hint={gdp?.observations.at(-1)?.period ?? "2019 prices"} wide />
          <Kpi icon={<TrendingUp className="size-4" />} label="Point change" value={trend?.percentagePointChange === null || trend?.percentagePointChange === undefined ? "—" : `${trend.percentagePointChange.toFixed(2)} pp`} hint={trend ? `${trend.startPeriod} to ${trend.endPeriod}` : "Headline series"} wide />
        </div>
        <ChartCard title="Real GDP, quarter by quarter" primary={pointText(gdp)} secondary="2019 constant prices" caption="Printed growth, not a mix with nominal GDP.">
          {gdp && <StatChart compact type="line" label="Quarterly real GDP growth" series={[seriesFromStatistics("gdp", "Real GDP", gdp.unit, gdp.observations)]} />}
        </ChartCard>
        <ChartCard title="Core inflation" primary={pointText(core)} secondary={core?.observations.at(-1)?.period ?? ""} caption="All items less farm produce and energy.">
          {core && <StatChart compact type="area" label="Core inflation" series={[seriesFromStatistics("core", "Core", core.unit, core.observations)]} />}
        </ChartCard>
      </section>

      <section className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid gap-3">
          <Kpi icon={<ArrowUpRight className="size-4" />} label="Latest headline" value={latest ? formatObservation(latest.value, "percent") : "—"} hint="September 2026 CPI table" wide />
          <article className="terminal-card rounded-2xl px-4 py-3 text-sm text-[#9fb5a8]">
            <p className="text-[10px] tracking-[0.16em] uppercase">Reading</p>
            <p className="mt-2 leading-6 text-[#e9fff4]">{trend?.explanation ?? "The trend is calculated from the published headline series."}</p>
          </article>
        </div>
        <ChartCard title="Sector real growth" primary="Agriculture, industries, services" secondary="" caption="GROWTH block of the Q2 2026 broad-sector sheet. Shares are not drawn here.">
          {sectors.length > 0 && (
            <StatChart
              compact
              type="line"
              label="Quarterly real growth for agriculture, industries and services"
              series={sectors.map((item) => seriesFromStatistics(item.indicator.id, item.indicator.shortName, item.unit, item.observations))}
            />
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function ChartCard({
  title,
  primary,
  secondary,
  caption,
  children,
}: {
  title: string;
  primary: string;
  secondary: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <article className="terminal-card flex min-h-[220px] flex-col rounded-2xl p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm text-[#b7d0c4]">{title}</h2>
          <p className="text-[11px] text-[#6f8f80]">{caption}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-[#f4fff8]">{primary}</p>
          {secondary && <p className="text-sm text-[#3dff9a]">{secondary}</p>}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  );
}

function Kpi({ icon, label, value, hint, wide = false }: { icon: React.ReactNode; label: string; value: string; hint: string; wide?: boolean }) {
  return (
    <article className={`terminal-card rounded-2xl p-3 ${wide ? "" : "min-h-[124px]"}`}>
      <div className="grid size-9 place-items-center rounded-full border border-[#1f9d4e]/40 bg-[#10281c] text-[#3dff9a]">{icon}</div>
      <p className="mt-3 text-[11px] tracking-wide text-[#8eab9c] uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-[#6f8f80]">{hint}</p>
    </article>
  );
}

function StatRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <ul className="terminal-card divide-y divide-white/5 rounded-2xl px-4">
      {rows.map(([label, value]) => (
        <li key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="text-[#8eab9c]">{label}</span>
          <span className="text-right text-[#3dff9a]">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function pointText(series: StatisticsResult | null) {
  const point = series?.observations.at(-1);
  return point ? formatObservation(point.value, series?.unit ?? "") : "—";
}

function asStats(run: ToolRun | undefined): StatisticsResult | null {
  if (!run?.ok || !run.result || typeof run.result !== "object" || !("observations" in run.result)) return null;
  return run.result as StatisticsResult;
}
