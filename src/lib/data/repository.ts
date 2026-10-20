import { readFileSync } from "node:fs";
import path from "node:path";
import type { Store } from "@/lib/data/types";

let memory: Store | null = null;

export function readSnapshot(): Store {
  if (memory) return memory;
  const file = path.join(process.cwd(), "data", "store.json");
  memory = JSON.parse(readFileSync(file, "utf8")) as Store;
  return memory;
}

export function setSnapshot(store: Store): void {
  memory = store;
}

export async function getStore(): Promise<Store> {
  if (process.env.DATABASE_URL) {
    const remote = await loadPostgresStore();
    if (remote && remote.observations.length > 0) {
      memory = remote;
      return remote;
    }
  }
  return readSnapshot();
}

async function loadPostgresStore(): Promise<Store | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: 1,
    connect_timeout: 8,
  });
  try {
    const rows = await sql<{ document: Store }[]>`select document from gazette_snapshot where id = 'current'`;
    return rows[0]?.document ?? null;
  } catch {
    return null;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function savePostgresStore(store: Store): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: 1,
  });
  try {
    await sql`insert into gazette_snapshot (id, document, updated_at)
      values ('current', ${sql.json(JSON.parse(JSON.stringify(store)))}, now())
      on conflict (id) do update set document = excluded.document, updated_at = now()`;
  } finally {
    await sql.end({ timeout: 2 });
  }
}
