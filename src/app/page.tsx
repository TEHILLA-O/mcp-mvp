import { Overview } from "@/components/overview/overview";
import { runTools } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const runs = await runTools([
    {
      requestId: "overview-headline",
      name: "get_statistics",
      arguments: { indicator: "cpi.all_items.yoy", start_period: "2018-01", end_period: "2026-09", geography: "nga" },
    },
    {
      requestId: "overview-food",
      name: "get_statistics",
      arguments: { indicator: "cpi.food.yoy", start_period: "2025-01", end_period: "2026-09", geography: "nga" },
    },
    {
      requestId: "overview-gdp",
      name: "get_statistics",
      arguments: { indicator: "gdp.real.growth.quarterly", start_period: "2024-Q1", end_period: "2026-Q2", geography: "nga" },
    },
    {
      requestId: "overview-trend",
      name: "calculate_trend",
      arguments: { indicator: "cpi.all_items.yoy", start_period: "2018-01", end_period: "2026-09", geography: "nga" },
    },
    {
      requestId: "overview-core",
      name: "get_statistics",
      arguments: { indicator: "cpi.core.yoy", start_period: "2025-01", end_period: "2026-09", geography: "nga" },
    },
    {
      requestId: "overview-mom",
      name: "get_statistics",
      arguments: { indicator: "cpi.all_items.mom", start_period: "2025-01", end_period: "2026-09", geography: "nga" },
    },
    {
      requestId: "overview-agri",
      name: "get_statistics",
      arguments: { indicator: "gdp.real.growth.agriculture.quarterly", start_period: "2024-Q1", end_period: "2026-Q2", geography: "nga" },
    },
    {
      requestId: "overview-ind",
      name: "get_statistics",
      arguments: { indicator: "gdp.real.growth.industries.quarterly", start_period: "2024-Q1", end_period: "2026-Q2", geography: "nga" },
    },
    {
      requestId: "overview-svc",
      name: "get_statistics",
      arguments: { indicator: "gdp.real.growth.services.quarterly", start_period: "2024-Q1", end_period: "2026-Q2", geography: "nga" },
    },
  ]);
  return <Overview runs={runs} />;
}
