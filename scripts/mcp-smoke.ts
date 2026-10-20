import { discoverTools, runTool } from "../src/lib/mcp/client";

const tools = (await discoverTools()) as Array<{ name: string }>;
console.log(tools.map((tool) => tool.name).join(", "));
const run = await runTool(
  "get_statistics",
  { indicator: "gdp.real.growth.quarterly", start_period: "2026-Q2", end_period: "2026-Q2", geography: "nga" },
  "smoke",
);
console.log(run.ok, run.text, `${run.trace.durationMs} ms`);
if (!run.ok) process.exit(1);
