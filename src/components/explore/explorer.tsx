"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatChart, seriesFromStatistics, type ChartSeries } from "@/components/charts/stat-chart";
import { Button } from "@/components/ui/button";
import { useInspector } from "@/components/inspector/provider";
import { useMcp } from "@/hooks/use-mcp";
import { calculateTrend, formatObservation } from "@/lib/statistics/analyze";
import type { Indicator, SeriesPoint, StatisticsResult } from "@/lib/data/types";
import { downloadText, toCsv } from "@/lib/utils";
import { chartAllowed, recommendChart, type ChartType } from "@/lib/visualization/recommend";

export function Explorer({ initialCategory, initialQuestion }: { initialCategory?: string; initialQuestion?: string }) {
  const { callTool, ask } = useMcp();
  const { select } = useInspector();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorId, setIndicatorId] = useState("cpi.all_items.yoy");
  const [periods, setPeriods] = useState<string[]>([]);
  const [start, setStart] = useState("2018-01");
  const [end, setEnd] = useState("2026-09");
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType | "auto">("auto");
  const [traceId, setTraceId] = useState<string | null>(null);
  const asked = useRef(false);

  function applyAnswer(body: Awaited<ReturnType<typeof ask>>) {
    if (body.interpretation && "message" in body.interpretation && body.interpretation.message) {
      setNote(body.interpretation.message);
      setSuggestions(body.interpretation.suggestions ?? []);
      return;
    }
    setNote(body.interpretation?.explanation ?? null);
    const nextArgs = body.interpretation?.arguments ?? {};
    if (typeof nextArgs.indicator === "string") setIndicatorId(nextArgs.indicator);
    if (typeof nextArgs.start_period === "string") setStart(nextArgs.start_period);
    if (typeof nextArgs.end_period === "string") setEnd(nextArgs.end_period);
    if (body.ok && body.result && typeof body.result === "object" && "observations" in body.result) {
      setResult(body.result as StatisticsResult);
      setTraceId(body.trace?.id ?? null);
    }
  }

  useEffect(() => {
    if (!initialQuestion || asked.current) return;
    asked.current = true;
    void ask(initialQuestion).then(applyAnswer);
  }, [initialQuestion, ask]);

  useEffect(() => {
    void callTool("list_indicators", initialCategory ? { category: initialCategory } : {}).then((body) => {
      const list = (body.result as { indicators?: Indicator[] } | null)?.indicators ?? [];
      setIndicators(list);
      if (initialCategory && list[0] && !list.some((item) => item.id === indicatorId)) setIndicatorId(list[0].id);
    });
    // The catalogue is loaded once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const available = await callTool("get_available_periods", { indicator: indicatorId, geography: "nga" });
      if (cancelled) return;
      const nextPeriods = (available.result as { periods?: string[] } | null)?.periods ?? [];
      setPeriods(nextPeriods);
      const nextStart = nextPeriods.includes(start) ? start : (nextPeriods.find((period) => period >= "2018-01") ?? nextPeriods[0] ?? start);
      const nextEnd = nextPeriods.includes(end) ? end : (nextPeriods.at(-1) ?? end);
      if (nextStart !== start) setStart(nextStart);
      if (nextEnd !== end) setEnd(nextEnd);
      const stats = await callTool("get_statistics", {
        indicator: indicatorId,
        start_period: nextStart,
        end_period: nextEnd,
        geography: "nga",
      });
      if (cancelled) return;
      if (!stats.ok) {
        setResult(null);
        setError(messageOf(stats.result));
      } else {
        setResult(stats.result as StatisticsResult);
        setTraceId(stats.trace?.id ?? null);
      }
      setLoading(false);
    })().catch((reason: unknown) => {
      if (!cancelled) {
        setLoading(false);
        setError(reason instanceof Error ? reason.message : "The series could not be loaded.");
      }
    });
    return () => {
      cancelled = true;
    };
    // start and end are applied inside after periods resolve; including them retriggers on every keystroke of the selects, which is intended.
  }, [indicatorId, start, end, callTool]);

  const series = useMemo<ChartSeries[]>(() => {
    if (!result) return [];
    return [seriesFromStatistics(result.indicator.id, result.indicator.shortName, result.unit, result.observations)];
  }, [result]);

  const recommendation = recommendChart({
    seriesCount: 1,
    pointCount: result?.observations.length ?? 0,
    geographyLevel: "country",
    timeSeries: true,
    composition: result?.indicator.unitKind === "share",
    singlePeriod: (result?.observations.length ?? 0) <= 1,
  });
  const activeChart = chartType === "auto" || !chartAllowed(recommendation, chartType) ? recommendation.type : chartType;
  const trend = result && result.observations.length >= 2 ? safeTrend(result.observations, result.unitKind, result.indicator.name) : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">Explorer</p>
        <h1 className="font-serif text-4xl sm:text-5xl">Ask for a series that was actually published.</h1>
      </header>
      <form
        className="surface rounded-3xl p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuggestions([]);
          void ask(question).then(applyAnswer);
        }}
      >
        <label htmlFor="question" className="px-2 text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
          Question
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Show Nigeria's inflation trend from 2020 to 2025"
            className="w-full rounded-full border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
          <Button type="submit" variant="solid">
            Run
          </Button>
        </div>
        {note && <p className="px-2 pt-3 text-sm text-[var(--muted)]">{note}</p>}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pt-3">
            {suggestions.map((item) => (
              <button key={item.id} type="button" className="rounded-full border border-[var(--line)] px-3 py-1 text-sm" onClick={() => setIndicatorId(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </form>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Indicator">
          <select aria-label="Indicator" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)} className="w-full bg-transparent">
            {indicators.filter((item) => item.geographyLevel === "country").map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <select aria-label="Start period" value={start} onChange={(event) => setStart(event.target.value)} className="w-full bg-transparent">
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <select aria-label="End period" value={end} onChange={(event) => setEnd(event.target.value)} className="w-full bg-transparent">
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </Field>
        <Field label="Chart">
          <select aria-label="Chart type" value={chartType} onChange={(event) => setChartType(event.target.value as ChartType | "auto")} className="w-full bg-transparent">
            <option value="auto">Recommended · {recommendation.type}</option>
            {recommendation.allowed.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <section className="surface min-h-[460px] rounded-3xl p-4 sm:p-6">
        {loading && <div className="h-80 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />}
        {!loading && error && <p className="text-[var(--danger)]">{error}</p>}
        {!loading && !error && result && result.observations.length === 0 && <p>No published observation falls in that window.</p>}
        {!loading && result && result.observations.length > 0 && (
          <button type="button" className="block h-96 w-full text-left" onClick={() => traceId && select(traceId)}>
            <StatChart type={activeChart} series={series} label={`${result.indicator.name}, ${start} to ${end}, ${result.unit}`} />
          </button>
        )}
      </section>
      {result && (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="space-y-3">
            <h2 className="font-serif text-2xl">Reading</h2>
            <p className="leading-7">{trend?.explanation ?? "A trend needs two published observations."}</p>
            <p className="text-sm leading-6 text-[var(--muted)]">{recommendation.reason}</p>
            {result.warnings.map((warning) => (
              <p key={warning} className="text-sm text-[var(--accent-2)]">
                {warning}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  downloadText(
                    `${result.indicator.id}.csv`,
                    toCsv(result.observations.map((point) => ({ period: point.period, value: point.value, unit: point.unit, source: point.sourceUrl }))),
                    "text/csv",
                  )
                }
              >
                <Download className="size-4" /> CSV
              </Button>
              <Button type="button" onClick={() => downloadChart(`${result.indicator.id}.svg`)}>
                SVG
              </Button>
              {traceId && (
                <Button type="button" onClick={() => select(traceId)}>
                  Inspect this call
                </Button>
              )}
            </div>
          </article>
          <article className="rounded-3xl border border-[var(--line)] p-5 text-sm leading-6">
            <h2 className="font-serif text-2xl">Source</h2>
            <p className="mt-2">{result.publicationTitle}</p>
            <p className="text-[var(--muted)]">{result.indicator.methodology}</p>
            <a className="mt-3 inline-block underline" href={result.sourceUrl} target="_blank" rel="noreferrer">
              Original catalogue record
            </a>
            <p className="mt-3 text-[var(--muted)]">Retrieved {result.retrievedAt ?? "with the current snapshot"}.</p>
          </article>
        </section>
      )}
      {result && <DataTable points={result.observations} unit={result.unit} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-[var(--line)] px-3 py-2 text-sm">
      <span className="block text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function DataTable({ points, unit }: { points: SeriesPoint[]; unit: string }) {
  return (
    <div className="overflow-auto rounded-3xl border border-[var(--line)]">
      <table className="w-full text-left text-sm">
        <caption className="px-4 py-3 text-left text-[var(--muted)]">Observations behind the chart. Blank periods were not published.</caption>
        <thead>
          <tr className="border-b border-[var(--line)]">
            <th className="px-4 py-2 font-medium">Period</th>
            <th className="px-4 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.period} className="border-b border-[var(--line)] last:border-0">
              <td className="px-4 py-2">{point.period}</td>
              <td className="px-4 py-2">{formatObservation(point.value, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function messageOf(result: unknown): string {
  if (result && typeof result === "object" && "error" in result) {
    const error = (result as { error?: { message?: string } }).error;
    return error?.message ?? "The tool returned an error.";
  }
  return "The tool returned an error.";
}

function safeTrend(points: SeriesPoint[], unitKind: StatisticsResult["unitKind"], name: string) {
  try {
    return calculateTrend(points, unitKind, name);
  } catch {
    return null;
  }
}

function downloadChart(filename: string) {
  const svg = document.querySelector("#main svg");
  if (!svg) return;
  downloadText(filename, new XMLSerializer().serializeToString(svg), "image/svg+xml");
}
