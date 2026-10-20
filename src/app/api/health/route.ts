import { getStore } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return Response.json({
    storage: process.env.DATABASE_URL ? "postgres" : "snapshot",
    generatedAt: store.generatedAt,
    observations: store.observations.length,
    datasets: store.datasets.length,
  });
}
