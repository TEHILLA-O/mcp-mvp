"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useInspector } from "@/components/inspector/provider";
import { useMcp } from "@/hooks/use-mcp";
import type { LiveTrace } from "@/lib/mcp/trace";

interface ToolInfo {
  name: string;
  description?: string;
}

const PRESETS: Record<string, string> = {
  get_statistics: '{\n  "indicator": "cpi.all_items.yoy",\n  "start_period": "2024-01",\n  "end_period": "2026-09",\n  "geography": "nga"\n}',
  search_datasets: '{\n  "query": "inflation",\n  "limit": 5\n}',
  list_indicators: '{\n  "category": "prices"\n}',
  calculate_trend: '{\n  "indicator": "cpi.all_items.yoy",\n  "start_period": "2020-01",\n  "end_period": "2026-09",\n  "geography": "nga"\n}',
  get_geographic_comparison: '{\n  "indicator": "cpi.all_items.yoy.state",\n  "period": "2026-09",\n  "geography_level": "state"\n}',
  compare_statistics: '{\n  "indicators": ["cpi.all_items.yoy", "cpi.food.yoy"],\n  "comparison_type": "overlay",\n  "geography": "nga"\n}',
  get_dataset_metadata: '{\n  "dataset_id": "nbs-cpi"\n}',
  get_available_periods: '{\n  "indicator": "cpi.all_items.yoy",\n  "geography": "nga"\n}',
};

export default function InspectorPage() {
  const { callTool } = useMcp();
  const { traces, selectedId, select } = useInspector();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [tool, setTool] = useState("get_statistics");
  const [args, setArgs] = useState(PRESETS.get_statistics ?? "{}");
  const [message, setMessage] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);

  useEffect(() => {
    void fetch("/api/query")
      .then((response) => response.json())
      .then((body: { tools?: ToolInfo[] }) => setTools(body.tools ?? []));
  }, []);

  const selected = traces.find((trace) => trace.id === selectedId) ?? traces[0] ?? null;
  const visible = traces.filter((trace) => {
    if (errorsOnly && trace.status !== "error") return false;
    if (methodFilter && trace.tool !== methodFilter) return false;
    return true;
  });
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const trace of traces) map.set(trace.tool, (map.get(trace.tool) ?? 0) + 1);
    return map;
  }, [traces]);
  const errors = traces.filter((trace) => trace.status === "error").length;
  const durations = traces.map((trace) => trace.durationMs).filter((value): value is number => value !== null);
  const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b1220] text-[#d5deea] xl:grid-cols-[240px_minmax(0,1fr)_380px]">
      <aside className="border-b border-white/10 bg-[#0d1526] xl:border-r xl:border-b-0">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
          <p className="text-sm font-semibold">MCP Inspector</p>
          <Link href="/" className="text-xs text-[#8ea0b8] underline">
            MCP - MVP
          </Link>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Sessions</p>
          <p className="mt-2 rounded-md bg-[#16324a] px-2 py-1.5 text-sm">This browser · {traces.length}</p>
        </div>
        <div className="px-3">
          <p className="text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Methods</p>
          <ul className="mt-2 space-y-0.5 text-sm">
            <li>
              <button type="button" className={`flex w-full justify-between rounded px-2 py-1 ${methodFilter === null ? "bg-white/10" : ""}`} onClick={() => setMethodFilter(null)}>
                <span>All</span>
                <span className="text-[#8ea0b8]">{traces.length}</span>
              </button>
            </li>
            {[...counts.entries()].map(([name, count]) => (
              <li key={name}>
                <button type="button" className={`flex w-full justify-between rounded px-2 py-1 ${methodFilter === name ? "bg-white/10" : ""}`} onClick={() => setMethodFilter(name)}>
                  <span className="truncate">{name}</span>
                  <span className="text-[#8ea0b8]">{count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-3 py-4">
          <p className="text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Transport</p>
          <p className="mt-2 rounded-md bg-[#123047] px-2 py-1 text-sm text-[#7ee0ff]">http</p>
          <label className="mt-3 flex items-center gap-2 text-xs text-[#8ea0b8]">
            <input type="checkbox" checked={errorsOnly} onChange={(event) => setErrorsOnly(event.target.checked)} />
            Errors only
          </label>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-3 text-xs text-[#9aabc0]">
          <span>{traces.length} calls</span>
          <span className="text-[#f07178]">{errors} err {traces.length ? `(${((errors / traces.length) * 100).toFixed(1)}%)` : ""}</span>
          <span>avg {average} ms</span>
          <span className="ml-auto text-[#3dd67a]">Live</span>
        </header>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Clients</p>
          <div className="mt-2 rounded-lg border border-[#1d4e3a] bg-[#102033] px-3 py-2 text-sm">
            <span className="text-[#3dd67a]">mcp-mvp</span>
            <span className="text-[#8ea0b8]"> → /api/mcp</span>
          </div>
        </div>
        <form
          className="grid gap-3 border-b border-white/10 px-4 py-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const parsed = JSON.parse(args) as Record<string, unknown>;
              setMessage(null);
              void callTool(tool, parsed).then((body) => {
                setMessage(body.ok ? "Completed." : body.text || "The tool returned an error.");
                if (body.trace?.id) select(body.trace.id);
              });
            } catch {
              setMessage("Arguments must be JSON.");
            }
          }}
        >
          <label className="text-xs text-[#8ea0b8]">
            Tool
            <select
              aria-label="MCP tool"
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0d1526] px-2 py-2 text-sm text-white"
              value={tool}
              onChange={(event) => {
                setTool(event.target.value);
                setArgs(PRESETS[event.target.value] ?? "{\n}");
              }}
            >
              {(tools.length ? tools : [{ name: tool }]).map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#8ea0b8]">
            Arguments
            <textarea aria-label="Tool arguments" value={args} onChange={(event) => setArgs(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-white/10 bg-[#0d1526] p-2 font-mono text-xs text-[#d7e7c5]" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-md bg-[#1f6feb] px-4 py-2 text-sm text-white">
              Execute
            </button>
          </div>
        </form>
        {message && <p className="px-4 py-2 text-xs text-[#9aabc0]">{message}</p>}
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#7f90a8]">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Latency</th>
                <th className="px-3 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-[#8ea0b8]">
                    No tool has run in this session.
                  </td>
                </tr>
              )}
              {visible.map((trace) => (
                <tr key={trace.id} className={trace.id === selected?.id ? "bg-white/5" : ""}>
                  <td className="px-3 py-1.5">
                    <button type="button" className="text-left" onClick={() => select(trace.id)}>
                      <span className={trace.status === "error" ? "text-[#f07178]" : "text-[#7ee0a8]"}>{trace.tool}</span>
                    </button>
                  </td>
                  <td className="px-3 py-1.5">{labelFor(trace)}</td>
                  <td className={`px-3 py-1.5 ${latencyColor(trace)}`}>{trace.durationMs === null ? "Running" : `${trace.durationMs} ms`}</td>
                  <td className="px-3 py-1.5 text-[#8ea0b8]">{trace.startedAt.slice(11, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="border-t border-white/10 bg-[#0d1526] xl:border-t-0 xl:border-l">
        <div className="border-b border-white/10 px-3 py-3 text-xs text-[#8ea0b8]">
          {selected ? (
            <>
              <p className="text-sm text-white">{selected.tool}</p>
              <p className="mt-1">status {selected.status}</p>
              <p>latency {selected.durationMs === null ? "—" : `${selected.durationMs} ms`}</p>
              <p>bytes {selected.responseBytes ?? "—"}</p>
            </>
          ) : (
            <p>Select a call</p>
          )}
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Arguments</p>
          <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-[#070d18] p-3 font-mono text-[11px] leading-5 text-[#d7e7c5]">{selected ? JSON.stringify(selected.arguments, null, 2) : ""}</pre>
          <p className="mt-4 text-[10px] tracking-[0.16em] text-[#7f90a8] uppercase">Result</p>
          <pre className="mt-2 max-h-[50vh] overflow-auto rounded-md bg-[#070d18] p-3 font-mono text-[11px] leading-5 text-[#d7e7c5]">{selected ? JSON.stringify(selected.response ?? { error: selected.error }, null, 2) : ""}</pre>
        </div>
      </aside>
    </div>
  );
}

function labelFor(trace: LiveTrace) {
  if (trace.status === "executing") return "running";
  if (trace.status === "error") return "error";
  return "ok";
}

function latencyColor(trace: LiveTrace) {
  if (trace.status === "error") return "text-[#f07178]";
  if (trace.durationMs === null) return "text-[#f4d03f]";
  if (trace.durationMs > 200) return "text-[#f4d03f]";
  return "text-[#7ee0a8]";
}
