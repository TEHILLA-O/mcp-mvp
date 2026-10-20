"use client";

import { useEffect, useMemo, useState } from "react";
import { NigeriaMap, type MapRow } from "@/components/charts/nigeria-map";
import { StatChart } from "@/components/charts/stat-chart";
import { useInspector } from "@/components/inspector/provider";
import { useMcp } from "@/hooks/use-mcp";
import { formatObservation } from "@/lib/statistics/analyze";
import { downloadText, toCsv } from "@/lib/utils";

interface GeoResult {
  period: string;
  unit: string;
  methodology: string;
  note: string;
  rows: MapRow[];
  missing: string[];
  indicator: { name: string; id: string };
}

const INDICATORS = [
  { id: "cpi.all_items.yoy.state", label: "State headline inflation" },
  { id: "cpi.all_items.index.state", label: "State CPI index" },
];

export function GeographyView() {
  const { callTool } = useMcp();
  const { select } = useInspector();
  const [indicator, setIndicator] = useState(INDICATORS[0]?.id ?? "");
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState("");
  const [result, setResult] = useState<GeoResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);

  useEffect(() => {
    void callTool("get_available_periods", { indicator }).then((body) => {
      const next = (body.result as { periods?: string[] } | null)?.periods ?? [];
      setPeriods(next);
      setPeriod((current) => (next.includes(current) ? current : (next.at(-1) ?? "")));
    });
  }, [indicator, callTool]);

  useEffect(() => {
    if (!period) return;
    void callTool("get_geographic_comparison", { indicator, period, geography_level: "state" }).then((body) => {
      if (!body.ok) {
        setError(body.text || "No geographic series is available for that request.");
        setResult(null);
        return;
      }
      setError(null);
      setResult(body.result as GeoResult);
      setTraceId(body.trace?.id ?? null);
    });
  }, [indicator, period, callTool]);

  const ranked = useMemo(() => [...(result?.rows ?? [])].sort((a, b) => b.value - a.value), [result]);
  const selectedRow = result?.rows.find((row) => row.geographyId === selected) ?? ranked[0];
  const median = ranked.length ? ranked[Math.floor(ranked.length / 2)]?.value ?? null : null;
  const max = ranked[0]?.value ?? 1;
  const buckets = useMemo(() => bin(ranked), [ranked]);

  return (
    <div className="-mx-3 overflow-hidden rounded-2xl border border-[#2a2e3d] bg-[#161821] text-[#f2f4f8] sm:-mx-5 lg:-mx-6">
      <div className="grid lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#12141c] p-4 lg:border-r lg:border-b-0">
          <p className="text-[10px] tracking-[0.18em] text-[#8b93a7] uppercase">Region</p>
          <p className="mt-2 text-sm font-medium">Nigeria</p>
          <p className="mt-1 text-xs text-[#8b93a7]">36 states and the FCT</p>
          <label className="mt-5 block text-xs text-[#8b93a7]">
            Indicator
            <select aria-label="State indicator" className="mt-1 w-full rounded-lg border border-white/10 bg-[#1c1f2b] px-2 py-2 text-sm text-white" value={indicator} onChange={(event) => setIndicator(event.target.value)}>
              {INDICATORS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs text-[#8b93a7]">
            Period
            <select aria-label="Period" className="mt-1 w-full rounded-lg border border-white/10 bg-[#1c1f2b] px-2 py-2 text-sm text-white" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <ul className="mt-6 space-y-2 text-xs">
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#3dd67a]" /> Lower published rate</li>
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#f4d03f]" /> Middle of the range</li>
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#e23b4a]" /> Higher published rate</li>
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-sm border border-[#4a4158] bg-[#241e2c]" /> Not published</li>
          </ul>
          <p className="mt-4 text-[11px] leading-5 text-[#8b93a7]">Boundaries: geoBoundaries ADM1, CC BY 4.0, GRID3. Not an NBS product.</p>
        </aside>
        <div className="min-w-0 p-4 sm:p-5">
          {error && <p className="text-[#f07178]">{error}</p>}
          {result && (
            <>
              <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-[#8b93a7] uppercase">{result.indicator.name}</p>
                  <div className="mt-2 flex items-end gap-3">
                    <p className="text-6xl font-semibold tracking-tight">{selectedRow ? formatObservation(selectedRow.value, result.unit) : "—"}</p>
                    {selectedRow && median !== null && (
                      <p className={`mb-2 text-sm ${selectedRow.value <= median ? "text-[#3dd67a]" : "text-[#e23b4a]"}`}>
                        {selectedRow.value <= median ? "At or below" : "Above"} the median state
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-[#c5cad6]">{selectedRow ? selectedRow.name : "Select a state"} · {result.period}</p>
                  <p className="mt-2 text-xs leading-5 text-[#8b93a7]">{result.note}</p>
                  <ul className="mt-4 max-h-[340px] space-y-2 overflow-auto pr-1">
                    {ranked.slice(0, 12).map((row) => (
                      <li key={row.geographyId}>
                        <button type="button" className="w-full text-left" onClick={() => setSelected(row.geographyId)}>
                          <span className="flex items-center justify-between text-xs">
                            <span>{row.name}</span>
                            <span>{row.value.toFixed(1)}</span>
                          </span>
                          <span className="mt-1 block h-1.5 rounded-full bg-[#2a2e3d]">
                            <span className="block h-1.5 rounded-full bg-[#e23b4a]" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-3 text-xs">
                    <button type="button" className="underline" onClick={() => traceId && select(traceId)}>
                      Inspect map call
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        downloadText(
                          "state-comparison.csv",
                          toCsv(result.rows.map((row) => ({ state: row.name, period: row.period, value: row.value, unit: row.unit }))),
                          "text/csv",
                        )
                      }
                    >
                      Download CSV
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#1b1e2a] p-2">
                  <NigeriaMap rows={result.rows} selectedId={selected} onSelect={setSelected} />
                </div>
              </div>
              <div className="mt-4 h-48 rounded-2xl bg-[#1b1e2a] p-3">
                <StatChart
                  compact
                  type="bar"
                  label={`How many states fall in each band of ${result.indicator.name}`}
                  series={[{ id: "states", label: "States", unit: "count", points: buckets }]}
                />
              </div>
              {result.missing.length > 0 && <p className="mt-3 text-xs text-[#8b93a7]">Missing, not zero: {result.missing.join(", ")}.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function bin(rows: MapRow[]) {
  if (rows.length === 0) return [];
  const values = rows.map((row) => row.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const edges = [0, 0.25, 0.5, 0.75, 1].map((t) => min + span * t);
  return edges.slice(0, -1).map((start, index) => {
    const end = edges[index + 1] ?? start;
    const count = rows.filter((row) => (index === 3 ? row.value >= start && row.value <= end : row.value >= start && row.value < end)).length;
    return { period: `${start.toFixed(1)}–${end.toFixed(1)}`, value: count };
  });
}
