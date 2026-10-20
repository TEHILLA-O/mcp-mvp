import { writeFileSync } from "node:fs";
import path from "node:path";
import { assertStore, buildStore } from "@/lib/data/ingestion/build-store";
import { savePostgresStore } from "@/lib/data/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = process.env.INGEST_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const store = await buildStore({ retrievedAt: new Date().toISOString() });
    assertStore(store);
    let wroteFile = false;
    try {
      writeFileSync(path.join(process.cwd(), "data", "store.json"), JSON.stringify(store));
      wroteFile = true;
    } catch {
      wroteFile = false;
    }
    let wroteDatabase = false;
    if (process.env.DATABASE_URL) {
      await savePostgresStore(store);
      wroteDatabase = true;
    }
    if (!wroteFile && !wroteDatabase) {
      return Response.json(
        { error: "The snapshot could not be stored. On Vercel, set DATABASE_URL before running ingestion." },
        { status: 409 },
      );
    }
    return Response.json({ ok: true, observations: store.observations.length, wroteFile, wroteDatabase });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Ingestion failed and existing observations were left unchanged." }, { status: 500 });
  }
}
