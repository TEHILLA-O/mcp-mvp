import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { assertStore, buildStore } from "../src/lib/data/ingestion/build-store";

const RAW = path.join(process.cwd(), "data", "raw");

const DOWNLOADS = [
  {
    url: "https://microdata.nigerianstat.gov.ng/index.php/catalog/154/download/1440",
    dest: "cpi_1New_September2026.xlsx",
    zipEntry: /cpi_1New_September2026\.xlsx$/i,
  },
  {
    url: "https://microdata.nigerianstat.gov.ng/index.php/catalog/147/download/1433",
    dest: "Q2 2026 GDP_w.xlsx",
    zipEntry: /\.xlsx$/i,
  },
  {
    url: "https://microdata.nigerianstat.gov.ng/index.php/catalog/147/download/1257",
    dest: "gdp-rebased-2019-2024.xlsx",
    zipEntry: null,
  },
];

async function fetchSources(): Promise<void> {
  mkdirSync(RAW, { recursive: true });
  for (const item of DOWNLOADS) {
    const response = await fetch(item.url, { headers: { "user-agent": "GazetteNBSIngest/1.0" } });
    if (!response.ok) throw new Error(`Download failed ${item.url}: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!item.zipEntry) {
      writeFileSync(path.join(RAW, item.dest), bytes);
      continue;
    }
    const archive = unzipSync(bytes);
    const entry = Object.keys(archive).find((name) => item.zipEntry?.test(name));
    if (!entry || !archive[entry]) throw new Error(`No workbook matched in ${item.url}`);
    writeFileSync(path.join(RAW, item.dest), archive[entry]);
    console.log(`saved ${item.dest} from ${entry}`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--fetch")) await fetchSources();
  const retrievedAt = new Date().toISOString();
  const store = await buildStore({ retrievedAt });
  assertStore(store);
  mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "data", "store.json"), JSON.stringify(store));
  console.log(`Wrote ${store.observations.length} observations at ${retrievedAt}`);
  for (const warning of store.ingestions[0]?.warnings ?? []) console.log("warning:", warning);
  if (process.env.DATABASE_URL) {
    const { savePostgresStore } = await import("../src/lib/data/repository");
    await savePostgresStore(store);
    console.log("Upserted gazette_snapshot.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
