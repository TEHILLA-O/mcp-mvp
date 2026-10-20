import path from "node:path";
import ExcelJS from "exceljs";
import {
  CPI_FILE,
  CPI_METHODOLOGY,
  CPI_PUBLICATION,
  CPI_SOURCE,
  GDP_METHODOLOGY,
  GDP_Q2_FILE,
  GDP_Q2_PUBLICATION,
  GDP_REBASE_FILE,
  GDP_REBASE_PUBLICATION,
  GDP_SOURCE,
  SHAPE_NAME,
  STATE_ISO,
} from "@/lib/data/ingestion/catalog";
import type { Cell } from "@/lib/data/ingestion/cells";
import { parseCpiNational, parseCpiStates, parseGdpAnnualHistory, parseGdpQuarterly, toObservation } from "@/lib/data/ingestion/parse-nbs";
import type { Dataset, Frequency, Geography, Indicator, Observation, Store } from "@/lib/data/types";

async function readSheet(file: string, sheetName: string): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets.find((item) => item.name === sheetName);
  if (!sheet) {
    throw new Error(`Workbook ${path.basename(file)} is missing sheet "${sheetName}". Found: ${workbook.worksheets.map((item) => item.name).join(", ")}`);
  }
  const rows: Cell[][] = [];
  const last = sheet.rowCount;
  for (let index = 1; index <= last; index += 1) {
    const values = sheet.getRow(index).values as Cell[];
    rows.push(values.slice(1));
  }
  return rows;
}

function indicator(partial: Indicator): Indicator {
  return partial;
}

export async function buildStore(options: { retrievedAt: string; rawDir?: string }): Promise<Store> {
  const rawDir = options.rawDir ?? path.join(process.cwd(), "data", "raw");
  const cpiFile = path.join(rawDir, "cpi_1New_September2026.xlsx");
  const gdpFile = path.join(rawDir, "Q2 2026 GDP_w.xlsx");
  const rebaseFile = path.join(rawDir, "gdp-rebased-2019-2024.xlsx");

  const [cpiTable, cpiStates, gdpReal, gdpBroad, gdpAnnual] = await Promise.all([
    readSheet(cpiFile, "Table1"),
    readSheet(cpiFile, "Table-5"),
    readSheet(gdpFile, "real gdp growth rate %"),
    readSheet(gdpFile, "Broad sector_Growth_Contr_%"),
    readSheet(rebaseFile, "Real growth rate %"),
  ]);

  const warnings: string[] = [];
  const drafts = [
    parseCpiNational(cpiTable),
    parseCpiStates(cpiStates),
    parseGdpQuarterly(gdpReal, gdpBroad),
    parseGdpAnnualHistory(gdpAnnual),
  ];
  for (const draft of drafts) warnings.push(...draft.warnings);

  const seen = new Set<string>();
  const observations: Observation[] = [];
  for (const draft of drafts.flatMap((item) => item.observations)) {
    const observation = toObservation(draft, options.retrievedAt);
    if (seen.has(observation.id)) {
      warnings.push(`Duplicate observation ${observation.id} dropped before publish.`);
      continue;
    }
    seen.add(observation.id);
    if (!Number.isFinite(observation.value)) throw new Error(`Non-finite value in ${observation.id}`);
    observations.push(observation);
  }

  const geographies: Geography[] = [
    { id: "nga", name: "Nigeria", level: "country", parentId: null, shapeName: null },
    ...Object.entries(STATE_ISO).map(([name, id]) => ({
      id,
      name: name === "Abuja" ? "Federal Capital Territory" : name,
      level: "state" as const,
      parentId: "nga",
      shapeName: SHAPE_NAME[name] ?? name,
    })),
  ];

  const indicators: Indicator[] = [
    indicator({
      id: "cpi.all_items.index",
      datasetId: "nbs-cpi",
      name: "CPI all items index",
      shortName: "All items index",
      description: "Composite all-items consumer price index, base 2024 = 100.",
      category: "prices",
      unit: "index",
      unitKind: "index",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_index",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["cpi", "consumer price index", "price index", "all items index"],
    }),
    indicator({
      id: "cpi.all_items.yoy",
      datasetId: "nbs-cpi",
      name: "Headline inflation, year on year",
      shortName: "Headline inflation",
      description: "Published year-on change in the all-items CPI. This is a percent rate, not an index.",
      category: "prices",
      unit: "percent",
      unitKind: "percent",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_yoy",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["inflation", "headline inflation", "cpi inflation", "year on year inflation"],
    }),
    indicator({
      id: "cpi.all_items.mom",
      datasetId: "nbs-cpi",
      name: "Headline inflation, month on month",
      shortName: "Monthly inflation",
      description: "Published month-on change in the all-items CPI.",
      category: "prices",
      unit: "percent",
      unitKind: "percent",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_mom",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["month on month", "monthly inflation", "mom inflation"],
    }),
    indicator({
      id: "cpi.food.index",
      datasetId: "nbs-cpi",
      name: "CPI food index",
      shortName: "Food index",
      description: "Food index from the composite CPI table, base 2024 = 100.",
      category: "prices",
      unit: "index",
      unitKind: "index",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_index",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["food index", "food cpi"],
    }),
    indicator({
      id: "cpi.food.yoy",
      datasetId: "nbs-cpi",
      name: "Food inflation, year on year",
      shortName: "Food inflation",
      description: "Published year-on change in the food CPI.",
      category: "prices",
      unit: "percent",
      unitKind: "percent",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_yoy",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["food inflation", "food prices"],
    }),
    indicator({
      id: "cpi.core.yoy",
      datasetId: "nbs-cpi",
      name: "Core inflation, year on year",
      shortName: "Core inflation",
      description: "Published year-on change in all items less farm produce and energy.",
      category: "prices",
      unit: "percent",
      unitKind: "percent",
      frequency: "monthly",
      geographyLevel: "country",
      comparableGroup: "cpi_yoy",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["core inflation", "core cpi"],
    }),
    indicator({
      id: "cpi.all_items.index.state",
      datasetId: "nbs-cpi",
      name: "State all-items CPI index",
      shortName: "State CPI index",
      description: "Combined urban and rural all-items index by state, for the months printed in Table 5.",
      category: "prices",
      unit: "index",
      unitKind: "index",
      frequency: "monthly",
      geographyLevel: "state",
      comparableGroup: "cpi_state_index",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["state cpi", "state price index"],
    }),
    indicator({
      id: "cpi.all_items.yoy.state",
      datasetId: "nbs-cpi",
      name: "State headline inflation, year on year",
      shortName: "State inflation",
      description: "All-items annual change by state for the latest month in Table 5.",
      category: "prices",
      unit: "percent",
      unitKind: "percent",
      frequency: "monthly",
      geographyLevel: "state",
      comparableGroup: "cpi_state_yoy",
      revisionId: "nbs-cpi-2026-09",
      methodology: CPI_METHODOLOGY,
      aliases: ["state inflation", "inflation by state"],
    }),
    indicator({
      id: "gdp.real.growth.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Real GDP growth, quarterly",
      shortName: "Real GDP growth",
      description: "Quarterly real GDP growth at 2019 constant basic prices.",
      category: "national_accounts",
      unit: "percent",
      unitKind: "percent",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_real_growth_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["gdp", "gdp growth", "real gdp", "economic growth", "output growth"],
    }),
    indicator({
      id: "gdp.real.growth.annual",
      datasetId: "nbs-gdp-a",
      name: "Real GDP growth, annual",
      shortName: "Annual real GDP growth",
      description: "Annual real GDP growth at 2019 constant basic prices.",
      category: "national_accounts",
      unit: "percent",
      unitKind: "percent",
      frequency: "annual",
      geographyLevel: "country",
      comparableGroup: "gdp_real_growth_a",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["annual gdp", "yearly gdp growth"],
    }),
    indicator({
      id: "gdp.real.growth.agriculture.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Agriculture real growth, quarterly",
      shortName: "Agriculture growth",
      description: "Quarterly real growth of the agriculture sector at 2019 prices.",
      category: "national_accounts",
      unit: "percent",
      unitKind: "percent",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_real_growth_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["agriculture growth", "farm growth"],
    }),
    indicator({
      id: "gdp.real.growth.industries.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Industries real growth, quarterly",
      shortName: "Industries growth",
      description: "Quarterly real growth of industries at 2019 prices.",
      category: "national_accounts",
      unit: "percent",
      unitKind: "percent",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_real_growth_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["industrial growth", "industry growth"],
    }),
    indicator({
      id: "gdp.real.growth.services.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Services real growth, quarterly",
      shortName: "Services growth",
      description: "Quarterly real growth of services at 2019 prices.",
      category: "national_accounts",
      unit: "percent",
      unitKind: "percent",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_real_growth_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["services growth"],
    }),
    indicator({
      id: "gdp.share.agriculture.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Agriculture share of real GDP",
      shortName: "Agriculture share",
      description: "Agriculture contribution to real GDP. A share, not a growth rate.",
      category: "national_accounts",
      unit: "percent of real GDP",
      unitKind: "share",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_share_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["agriculture share"],
    }),
    indicator({
      id: "gdp.share.industries.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Industries share of real GDP",
      shortName: "Industries share",
      description: "Industries contribution to real GDP. A share, not a growth rate.",
      category: "national_accounts",
      unit: "percent of real GDP",
      unitKind: "share",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_share_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["industry share", "industries share"],
    }),
    indicator({
      id: "gdp.share.services.quarterly",
      datasetId: "nbs-gdp-q",
      name: "Services share of real GDP",
      shortName: "Services share",
      description: "Services contribution to real GDP. A share, not a growth rate.",
      category: "national_accounts",
      unit: "percent of real GDP",
      unitKind: "share",
      frequency: "quarterly",
      geographyLevel: "country",
      comparableGroup: "gdp_share_q",
      revisionId: "nbs-gdp-2026-q2",
      methodology: GDP_METHODOLOGY,
      aliases: ["services share"],
    }),
  ];

  const datasets: Dataset[] = [
    datasetRecord("nbs-cpi", "prices", "monthly", CPI_PUBLICATION, CPI_SOURCE, CPI_FILE, CPI_METHODOLOGY, observations, indicators),
    datasetRecord("nbs-gdp-q", "national_accounts", "quarterly", GDP_Q2_PUBLICATION, GDP_SOURCE, GDP_Q2_FILE, GDP_METHODOLOGY, observations, indicators),
    datasetRecord("nbs-gdp-a", "national_accounts", "annual", "Real GDP growth, annual, 2019 prices", GDP_SOURCE, GDP_REBASE_FILE, GDP_METHODOLOGY, observations, indicators),
  ];

  return {
    generatedAt: options.retrievedAt,
    sources: [
      {
        id: "nbs",
        publisher: "National Bureau of Statistics, Nigeria",
        name: "NBS microdata catalogue",
        url: "https://microdata.nigerianstat.gov.ng/index.php/catalog",
        notes: "Public statistical tables. Microdata files that require an application are not ingested.",
      },
    ],
    datasets,
    indicators,
    geographies,
    revisions: [
      { id: "nbs-cpi-2026-09", datasetId: "nbs-cpi", label: "September 2026 CPI tables", retrievedAt: options.retrievedAt, notes: "Single vintage. Not spliced with the November 2009 base." },
      { id: "nbs-gdp-2026-q2", datasetId: "nbs-gdp-q", label: "Q2 2026 GDP tables", retrievedAt: options.retrievedAt, notes: "2019 constant prices. Includes 2024 and 2025 annual totals." },
      { id: "nbs-gdp-rebase-2019-2024", datasetId: "nbs-gdp-a", label: "2019–2024 rebasing tables", retrievedAt: options.retrievedAt, notes: "Used for annual real growth in 2020, 2021, 2022 and 2023 only." },
    ],
    observations,
    ingestions: [
      {
        id: `ingest-${options.retrievedAt}`,
        startedAt: options.retrievedAt,
        finishedAt: options.retrievedAt,
        status: "success",
        datasets: datasets.map((item) => item.id),
        observationCount: observations.length,
        warnings,
        notes: "Idempotent rebuild from the three verified workbooks. Blank cells were omitted rather than stored as zero.",
      },
    ],
  };
}

function datasetRecord(
  id: string,
  category: string,
  frequency: Frequency,
  publicationTitle: string,
  sourceUrl: string,
  fileUrl: string,
  methodology: string,
  observations: Observation[],
  indicators: Indicator[],
): Dataset {
  const ids = indicators.filter((item) => item.datasetId === id).map((item) => item.id);
  const periods = observations.filter((item) => item.datasetId === id).map((item) => item.period).sort();
  const names: Record<string, { name: string; description: string; limitations: string }> = {
    "nbs-cpi": {
      name: "Consumer price index and inflation",
      description: "Composite, food and core CPI plus state all-items index and year-on change from the September 2026 tables.",
      limitations: "State year-on change is published for September 2026 only. State index levels are published for the three months in Table 5. Labour-market rates are not in this dataset.",
    },
    "nbs-gdp-q": {
      name: "Quarterly real GDP",
      description: "Quarterly real growth and sector shares at 2019 constant prices, Q1 2024 through Q2 2026.",
      limitations: "Nominal GDP is a different series and is not included. Sector shares must not be read as growth rates.",
    },
    "nbs-gdp-a": {
      name: "Annual real GDP growth",
      description: "Annual real GDP growth at 2019 constant prices, 2020 through 2025.",
      limitations: "2020–2023 come from the rebasing tables. 2024–2025 come from the Q2 2026 quarterly workbook's annual columns. The 2010-price GDP file is excluded.",
    },
  };
  const meta = names[id];
  return {
    id,
    sourceId: "nbs",
    name: meta?.name ?? id,
    description: meta?.description ?? "",
    category,
    geography: id === "nbs-cpi" ? "Nigeria and 36 states plus FCT" : "Nigeria",
    frequency,
    periodStart: periods[0] ?? "",
    periodEnd: periods[periods.length - 1] ?? "",
    sourceUrl,
    publicationTitle,
    publicationDate: null,
    methodology,
    limitations: `${meta?.limitations ?? ""} File: ${fileUrl}`,
    indicatorIds: ids,
  };
}

export function assertStore(store: Store): void {
  const headline = store.observations.find((item) => item.indicatorId === "cpi.all_items.yoy" && item.period === "2026-09" && item.geographyId === "nga");
  if (!headline || Math.abs(headline.value - 14.629617) > 0.001) {
    throw new Error(`September 2026 headline inflation did not match the workbook (got ${headline?.value}).`);
  }
  const gdp = store.observations.find((item) => item.indicatorId === "gdp.real.growth.quarterly" && item.period === "2026-Q2");
  if (!gdp || Math.abs(gdp.value - 4.434) > 0.02) throw new Error("Q2 2026 real GDP growth failed verification.");
  const states = new Set(store.observations.filter((item) => item.indicatorId === "cpi.all_items.yoy.state").map((item) => item.geographyId));
  if (states.size !== 37) throw new Error("State inflation coverage is incomplete.");
  const zeroFilled = store.observations.filter((item) => item.value === 0 && item.indicatorId.includes("index"));
  if (zeroFilled.length) throw new Error("Index observations stored as zero.");
}
