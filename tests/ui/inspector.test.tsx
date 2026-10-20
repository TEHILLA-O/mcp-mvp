// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { InspectorProvider, useInspector } from "@/components/inspector/provider";
import type { McpTrace } from "@/lib/mcp/trace";

afterEach(() => cleanup());

const trace: McpTrace = {
  id: "trace-1",
  tool: "get_statistics",
  status: "success",
  arguments: { indicator: "cpi.all_items.yoy" },
  startedAt: "2026-10-20T00:00:00.000Z",
  durationMs: 12,
  responseBytes: 40,
  response: { observations: [{ period: "2026-09", value: 14.63 }] },
};

function Seed() {
  const { commit } = useInspector();
  useEffect(() => {
    commit(trace);
  }, [commit]);
  return null;
}

describe("inspector", () => {
  it("shows the tool name, duration and response", async () => {
    sessionStorage.clear();
    render(
      <InspectorProvider>
        <Seed />
        <InspectorPanel full />
      </InspectorProvider>,
    );
    expect((await screen.findAllByText("12 ms")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("get_statistics").length).toBeGreaterThan(0);
    expect(screen.getByText(/2026-09/)).toBeTruthy();
  });
});
