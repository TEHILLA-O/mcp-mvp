"use client";

import { Check, Copy, LoaderCircle, PanelRightClose, PanelRightOpen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useInspector } from "@/components/inspector/provider";
import { Button } from "@/components/ui/button";
import type { LiveTrace } from "@/lib/mcp/trace";

export function InspectorPanel({ full = false }: { full?: boolean }) {
  const { traces, selectedId, collapsed, select, toggle, clear } = useInspector();
  const selected = traces.find((trace) => trace.id === selectedId) ?? traces[0] ?? null;
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const enter = mounted && !reduce;
  if (!full && collapsed) {
    return (
      <div className="hidden border-l border-[var(--line)] lg:block">
        <button type="button" className="flex h-full w-12 items-center justify-center" onClick={toggle} aria-label="Open MCP inspector">
          <PanelRightOpen className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.aside
      id="mcp-inspector"
      aria-label="MCP execution inspector"
      initial={false}
      animate={{ opacity: 1, x: enter ? 0 : 0 }}
      className={full ? "space-y-4" : "border-t border-[var(--line)] bg-[var(--paper)] lg:w-[360px] lg:border-t-0 lg:border-l"}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">MCP</p>
          <h2 className="font-serif text-xl">Inspector</h2>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={clear}>
            Clear
          </Button>
          {!full && (
            <button type="button" aria-label="Collapse inspector" onClick={toggle} className="hidden rounded-full p-2 lg:inline-flex">
              <PanelRightClose className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className={full ? "grid gap-4 lg:grid-cols-[280px_1fr]" : "max-h-[70vh] overflow-auto lg:max-h-[calc(100vh-4rem)]"}>
        <ul className="space-y-1 px-3 pb-4" aria-label="Execution history">
          {traces.length === 0 && <li className="px-2 text-sm text-[var(--muted)]">No tool has run in this session.</li>}
          {traces.map((trace) => (
            <li key={trace.id}>
              <button
                type="button"
                onClick={() => select(trace.id)}
                className={`w-full rounded-2xl px-3 py-2 text-left ${trace.id === selected?.id ? "bg-black/5 dark:bg-white/5" : ""}`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <StatusDot status={trace.status} />
                  {trace.tool}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {trace.durationMs === null ? "Running" : `${trace.durationMs} ms`}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selected && <TraceDetail trace={selected} />}
      </div>
    </motion.aside>
  );
}

function StatusDot({ status }: { status: LiveTrace["status"] }) {
  const color = status === "success" ? "var(--accent)" : status === "error" ? "var(--danger)" : "var(--accent-2)";
  return (
    <span className="relative inline-flex size-2.5" aria-hidden>
      {status === "executing" && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />}
      <span className="relative inline-flex size-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

function TraceDetail({ trace }: { trace: LiveTrace }) {
  return (
    <div className="space-y-4 px-4 pb-6 text-sm">
      <p className="text-[var(--muted)]">
        {trace.status === "executing" && (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-3.5 animate-spin" /> Calling {trace.tool}
          </span>
        )}
        {trace.status === "success" && "Completed"}
        {trace.status === "error" && (trace.error || "The tool returned an error.")}
      </p>
      <Meta label="Started" value={trace.startedAt} />
      <Meta label="Duration" value={trace.durationMs === null ? "—" : `${trace.durationMs} ms`} />
      <Meta label="Response size" value={trace.responseBytes === null ? "—" : `${trace.responseBytes} bytes`} />
      <JsonBlock title="Arguments" value={trace.arguments} />
      <JsonBlock title="Response" value={trace.response} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-[var(--muted)]">{label}. </span>
      {value}
    </p>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)]"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          Copy
        </button>
      </div>
      <pre className="max-h-80 overflow-auto rounded-2xl border border-[var(--line)] bg-black/[0.03] p-3 text-xs leading-5 dark:bg-white/[0.03]">{text}</pre>
    </div>
  );
}
