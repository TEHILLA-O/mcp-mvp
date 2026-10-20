"use client";

import { useCallback } from "react";
import { useInspector } from "@/components/inspector/provider";
import type { McpTrace } from "@/lib/mcp/trace";

export interface QueryResponse {
  ok: boolean;
  trace: McpTrace | null;
  result: unknown;
  text?: string;
  interpretation?: { tool?: string; arguments?: Record<string, unknown>; explanation?: string; message?: string; suggestions?: Array<{ id: string; name: string }> };
}

export function useMcp() {
  const { begin, commit, dismiss } = useInspector();

  const callTool = useCallback(
    async (tool: string, args: Record<string, unknown>) => {
      const requestId = crypto.randomUUID();
      begin({
        id: requestId,
        tool,
        status: "executing",
        arguments: args,
        startedAt: new Date().toISOString(),
        durationMs: null,
        responseBytes: null,
        response: null,
      });
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, tool, arguments: args }),
      });
      const body = (await response.json()) as QueryResponse;
      if (body.trace) commit(body.trace);
      if (!response.ok) throw new Error(typeof body === "object" && body && "error" in body ? String((body as { error?: string }).error) : "Request failed");
      return body;
    },
    [begin, commit],
  );

  const ask = useCallback(
    async (question: string) => {
      const requestId = crypto.randomUUID();
      begin({
        id: requestId,
        tool: "pending",
        status: "executing",
        arguments: { question },
        startedAt: new Date().toISOString(),
        durationMs: null,
        responseBytes: null,
        response: null,
      });
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, question }),
      });
      const body = (await response.json()) as QueryResponse;
      if (body.trace) commit(body.trace);
      else dismiss(requestId);
      return body;
    },
    [begin, commit, dismiss],
  );

  return { callTool, ask };
}
