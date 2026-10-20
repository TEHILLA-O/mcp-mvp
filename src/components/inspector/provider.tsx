"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LiveTrace, McpTrace } from "@/lib/mcp/trace";

interface InspectorContextValue {
  traces: LiveTrace[];
  selectedId: string | null;
  collapsed: boolean;
  begin: (trace: LiveTrace) => void;
  commit: (trace: McpTrace) => void;
  dismiss: (id: string) => void;
  select: (id: string | null) => void;
  toggle: () => void;
  clear: () => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);
const STORAGE = "gazette-traces";

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [traces, setTraces] = useState<LiveTrace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const saved = sessionStorage.getItem(STORAGE);
      if (!saved) return;
      const parsed = JSON.parse(saved) as LiveTrace[];
      setTraces((current) => (current.length > 0 ? current : parsed));
    } catch {
      sessionStorage.removeItem(STORAGE);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(traces.slice(0, 25)));
    } catch {
      /* session storage can reject oversized traces */
    }
  }, [traces]);

  const begin = useCallback((trace: LiveTrace) => {
    setTraces((current) => [trace, ...current.filter((item) => item.id !== trace.id)].slice(0, 25));
    setSelectedId(trace.id);
    setCollapsed(false);
  }, []);

  const commit = useCallback((trace: McpTrace) => {
    const next: LiveTrace = { ...trace, status: trace.status };
    setTraces((current) => [next, ...current.filter((item) => item.id !== trace.id)].slice(0, 25));
    setSelectedId(trace.id);
  }, []);

  const dismiss = useCallback((id: string) => {
    setTraces((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<InspectorContextValue>(
    () => ({
      traces,
      selectedId,
      collapsed,
      begin,
      commit,
      dismiss,
      select: setSelectedId,
      toggle: () => setCollapsed((open) => !open),
      clear: () => {
        setTraces([]);
        setSelectedId(null);
        sessionStorage.removeItem(STORAGE);
      },
    }),
    [traces, selectedId, collapsed, begin, commit, dismiss],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector() {
  const context = useContext(InspectorContext);
  if (!context) throw new Error("useInspector must be used inside InspectorProvider");
  return context;
}
