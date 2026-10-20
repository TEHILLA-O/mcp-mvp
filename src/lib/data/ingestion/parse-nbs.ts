import {
  CPI_FILE,
  CPI_METHODOLOGY,
  CPI_PUBLICATION,
  GDP_METHODOLOGY,
  GDP_Q2_FILE,
  GDP_Q2_PUBLICATION,
  GDP_REBASE_FILE,
  GDP_REBASE_PUBLICATION,
  SHAPE_NAME,
  STATE_ISO,
} from "@/lib/data/ingestion/catalog";
import { cellNumber, cellText, monthPeriodFromCell, monthToken, observationId, yearToken, type Cell } from "@/lib/data/ingestion/cells";
import type { Frequency, Observation } from "@/lib/data/types";

export interface DraftObservation {
  indicatorId: string;
  value: number;
  unit: string;
  period: string;
  frequency: Frequency;
  geographyId: string;
  datasetId: string;
  sourceUrl: string;
  publicationTitle: string;
  publicationDate: string | null;
  revisionId: string;
  methodology: string;
}

const CPI_REVISION = "nbs-cpi-2026-09";
const GDP_Q_REVISION = "nbs-gdp-2026-q2";
const GDP_A_REVISION = "nbs-gdp-rebase-2019-2024";

function blankDraft(
  partial: Omit<DraftObservation, "publicationDate"> & { publicationDate?: string | null },
): DraftObservation {
  return { publicationDate: null, ...partial };
}

export function parseCpiNational(rows: Cell[][]): { observations: DraftObservation[]; warnings: string[] } {
  const warnings: string[] = [];
  const observations: DraftObservation[] = [];
  let year: number | null = null;
  const seen = new Set<string>();

  for (const row of rows) {
    const maybeYear = yearToken(row[0]);
    if (maybeYear) year = maybeYear;
    const month = monthToken(row[1]);
    if (!year || !month) continue;
    const period = `${year}-${month}`;
    const specs = [
      { indicatorId: "cpi.all_items.index", column: 2, unit: "index" },
      { indicatorId: "cpi.all_items.mom", column: 4, unit: "percent" },
      { indicatorId: "cpi.all_items.yoy", column: 5, unit: "percent" },
      { indicatorId: "cpi.food.index", column: 12, unit: "index" },
      { indicatorId: "cpi.food.yoy", column: 15, unit: "percent" },
      { indicatorId: "cpi.core.yoy", column: 20, unit: "percent" },
    ];
    for (const spec of specs) {
      const value = cellNumber(row[spec.column]);
      if (value === null) continue;
      const key = `${spec.indicatorId}|${period}`;
      if (seen.has(key)) {
        warnings.push(`Duplicate ${spec.indicatorId} ${period} ignored.`);
        continue;
      }
      seen.add(key);
      observations.push(
        blankDraft({
          indicatorId: spec.indicatorId,
          value,
          unit: spec.unit,
          period,
          frequency: "monthly",
          geographyId: "nga",
          datasetId: "nbs-cpi",
          sourceUrl: CPI_FILE,
          publicationTitle: CPI_PUBLICATION,
          revisionId: CPI_REVISION,
          methodology: CPI_METHODOLOGY,
        }),
      );
    }
  }

  if (!observations.some((item) => item.indicatorId === "cpi.all_items.yoy" && item.period === "2026-09")) {
    throw new Error("CPI Table 1 did not contain the September 2026 all-items year-on change. The workbook layout may have changed.");
  }
  return { observations, warnings };
}

interface QuarterColumn {
  index: number;
  period: string;
  frequency: Frequency;
}

function quarterColumns(yearRow: Cell[], quarterRow: Cell[]): QuarterColumn[] {
  const columns: QuarterColumn[] = [];
  let year: number | null = null;
  const width = Math.max(yearRow.length, quarterRow.length);
  for (let index = 0; index < width; index += 1) {
    const parsedYear = yearToken(yearRow[index]);
    if (parsedYear) year = parsedYear;
    const quarter = cellText(quarterRow[index]).toUpperCase();
    const leaked = cellText(yearRow[index]).toUpperCase();
    if (!year) continue;
    if (/^Q[1-4]$/.test(quarter)) columns.push({ index, period: `${year}-${quarter}`, frequency: "quarterly" });
    else if (quarter === "TOTAL") columns.push({ index, period: String(year), frequency: "annual" });
    else if (/^Q[1-4]$/.test(leaked)) columns.push({ index, period: `${year}-${leaked}`, frequency: "quarterly" });
  }
  return columns;
}

function pushGrid(
  observations: DraftObservation[],
  warnings: string[],
  row: Cell[],
  columns: QuarterColumn[],
  spec: {
    indicatorId: string;
    datasetId: string;
    sourceUrl: string;
    publicationTitle: string;
    revisionId: string;
    unit: string;
    frequency: Frequency;
  },
) {
  for (const column of columns) {
    if (column.frequency !== spec.frequency) continue;
    const value = cellNumber(row[column.index]);
    if (value === null) continue;
    const id = `${spec.indicatorId}|${column.period}`;
    if (observations.some((item) => item.indicatorId === spec.indicatorId && item.period === column.period && item.geographyId === "nga")) {
      warnings.push(`Duplicate ${id} ignored.`);
      continue;
    }
    observations.push(
      blankDraft({
        indicatorId: spec.indicatorId,
        value,
        unit: spec.unit,
        period: column.period,
        frequency: spec.frequency,
        geographyId: "nga",
        datasetId: spec.datasetId,
        sourceUrl: spec.sourceUrl,
        publicationTitle: spec.publicationTitle,
        revisionId: spec.revisionId,
        methodology: GDP_METHODOLOGY,
      }),
    );
  }
}

function findRow(rows: Cell[][], label: string): Cell[] {
  const wanted = label.toLowerCase();
  const row = rows.find((candidate) => cellText(candidate[0]).toLowerCase() === wanted);
  if (!row) throw new Error(`GDP workbook is missing the row "${label}".`);
  return row;
}

function findQuarterHeader(rows: Cell[][], start = 0): { yearRow: Cell[]; quarterRow: Cell[]; index: number } {
  for (let index = start; index < rows.length; index += 1) {
    const cells = rows[index]?.map((cell) => cellText(cell).toUpperCase()) ?? [];
    if (cells.includes("Q1") && cells.includes("Q4")) {
      return { yearRow: rows[index - 1] ?? [], quarterRow: rows[index] ?? [], index };
    }
  }
  throw new Error("GDP workbook is missing a quarter header.");
}

function repairLoneQuarter(yearRow: Cell[], quarterRow: Cell[], columns: QuarterColumn[]): QuarterColumn[] {
  const present = new Set(columns.map((column) => column.period));
  for (const column of [...columns]) {
    if (!column.period.endsWith("-Q2")) continue;
    const year = Number(column.period.slice(0, 4));
    const missing = `${year}-Q1`;
    if (present.has(missing)) continue;
    const previous = column.index - 1;
    if (yearToken(yearRow[previous]) === year && cellText(quarterRow[previous]) === "") {
      columns.push({ index: previous, period: missing, frequency: "quarterly" });
      present.add(missing);
    }
  }
  return columns;
}

export function parseGdpQuarterly(realRows: Cell[][], broadRows: Cell[][]): { observations: DraftObservation[]; warnings: string[] } {
  const warnings: string[] = [];
  const observations: DraftObservation[] = [];
  const realHeader = findQuarterHeader(realRows);
  const realColumns = repairLoneQuarter(realHeader.yearRow, realHeader.quarterRow, quarterColumns(realHeader.yearRow, realHeader.quarterRow));
  pushGrid(observations, warnings, findRow(realRows, "GDP at 2019 constant price"), realColumns, {
    indicatorId: "gdp.real.growth.quarterly",
    datasetId: "nbs-gdp-q",
    sourceUrl: GDP_Q2_FILE,
    publicationTitle: GDP_Q2_PUBLICATION,
    revisionId: GDP_Q_REVISION,
    unit: "percent",
    frequency: "quarterly",
  });

  const growthIndex = broadRows.findIndex((row) => cellText(row[0]).toUpperCase() === "GROWTH");
  if (growthIndex < 1) throw new Error("GDP broad-sector sheet is missing the GROWTH block.");
  const growthYear = broadRows[growthIndex - 1] ?? [];
  const growthQuarter = broadRows[growthIndex] ?? [];
  const growthColumns = repairLoneQuarter(growthYear, growthQuarter, quarterColumns(growthYear, growthQuarter));
  const sectorSpecs = [
    { label: "AGRICULTURE", indicatorId: "gdp.real.growth.agriculture.quarterly" },
    { label: "INDUSTRIES", indicatorId: "gdp.real.growth.industries.quarterly" },
    { label: "SERVICES", indicatorId: "gdp.real.growth.services.quarterly" },
  ];
  for (const spec of sectorSpecs) {
    const row = broadRows.slice(growthIndex + 1, growthIndex + 8).find((candidate) => cellText(candidate[0]).toUpperCase() === spec.label);
    if (!row) throw new Error(`GDP GROWTH block is missing ${spec.label}.`);
    pushGrid(observations, warnings, row, growthColumns, {
      indicatorId: spec.indicatorId,
      datasetId: "nbs-gdp-q",
      sourceUrl: GDP_Q2_FILE,
      publicationTitle: GDP_Q2_PUBLICATION,
      revisionId: GDP_Q_REVISION,
      unit: "percent",
      frequency: "quarterly",
    });
  }

  const shareHeader = findQuarterHeader(broadRows);
  if (shareHeader.index >= growthIndex) throw new Error("GDP broad-sector sheet is missing the contribution quarter header.");
  const shareColumns = quarterColumns(shareHeader.yearRow, shareHeader.quarterRow);
  const shareSpecs = [
    { label: "AGRICULTURE", indicatorId: "gdp.share.agriculture.quarterly" },
    { label: "INDUSTRIES", indicatorId: "gdp.share.industries.quarterly" },
    { label: "SERVICES", indicatorId: "gdp.share.services.quarterly" },
  ];
  for (const spec of shareSpecs) {
    const row = broadRows.slice(0, growthIndex).find((candidate) => cellText(candidate[0]).toUpperCase() === spec.label);
    if (!row) throw new Error(`GDP contribution block is missing ${spec.label}.`);
    pushGrid(observations, warnings, row, shareColumns, {
      indicatorId: spec.indicatorId,
      datasetId: "nbs-gdp-q",
      sourceUrl: GDP_Q2_FILE,
      publicationTitle: GDP_Q2_PUBLICATION,
      revisionId: GDP_Q_REVISION,
      unit: "percent",
      frequency: "quarterly",
    });
  }

  const annualColumns = realColumns.filter((column) => column.frequency === "annual" && (column.period === "2024" || column.period === "2025"));
  pushGrid(observations, warnings, findRow(realRows, "GDP at 2019 constant price"), annualColumns, {
    indicatorId: "gdp.real.growth.annual",
    datasetId: "nbs-gdp-a",
    sourceUrl: GDP_Q2_FILE,
    publicationTitle: GDP_Q2_PUBLICATION,
    revisionId: GDP_Q_REVISION,
    unit: "percent",
    frequency: "annual",
  });

  const q2 = observations.find((item) => item.indicatorId === "gdp.real.growth.quarterly" && item.period === "2026-Q2");
  if (!q2 || Math.abs(q2.value - 4.434) > 0.02) {
    throw new Error("Q2 2026 real GDP growth was not read as about 4.434 percent. Refusing to store a misaligned table.");
  }
  return { observations, warnings };
}

export function parseGdpAnnualHistory(rows: Cell[][]): { observations: DraftObservation[]; warnings: string[] } {
  const warnings: string[] = [];
  const header = rows.find((row) => row.some((cell) => yearToken(cell) === 2020));
  if (!header) throw new Error("Rebasing workbook is missing the 2020–2024 year header.");
  const years = new Map<number, number>();
  header.forEach((cell, index) => {
    const year = yearToken(cell);
    if (year && year >= 2020 && year <= 2023) years.set(year, index);
  });
  const row = findRow(rows, "GDP at Constant Basic Price");
  const observations: DraftObservation[] = [];
  for (const [year, index] of years) {
    const value = cellNumber(row[index]);
    if (value === null) continue;
    observations.push(
      blankDraft({
        indicatorId: "gdp.real.growth.annual",
        value,
        unit: "percent",
        period: String(year),
        frequency: "annual",
        geographyId: "nga",
        datasetId: "nbs-gdp-a",
        sourceUrl: GDP_REBASE_FILE,
        publicationTitle: GDP_REBASE_PUBLICATION,
        revisionId: GDP_A_REVISION,
        methodology: GDP_METHODOLOGY,
      }),
    );
  }
  if (observations.length !== 4) {
    warnings.push("Annual real GDP history did not yield four years (2020–2023).");
  }
  return { observations, warnings };
}

export function parseCpiStates(rows: Cell[][]): { observations: DraftObservation[]; warnings: string[] } {
  const warnings: string[] = [];
  const observations: DraftObservation[] = [];
  const dateRowIndex = rows.findIndex((row) => row.some((cell) => monthPeriodFromCell(cell)));
  const stateRowIndex = rows.findIndex((row) => row.some((cell) => cellText(cell).toLowerCase() === "state"));
  if (dateRowIndex < 0 || stateRowIndex < 0) throw new Error("CPI Table 5 is missing its date or state header.");
  const dateRow = rows[dateRowIndex] ?? [];
  const periods = [2, 4, 6].map((index) => monthPeriodFromCell(dateRow[index]));
  if (periods.some((period) => !period)) throw new Error("CPI Table 5 dates could not be read.");
  const latest = periods[2] as string;

  for (const row of rows.slice(stateRowIndex + 1)) {
    const name = cellText(row[1]);
    const iso = STATE_ISO[name];
    if (!iso) {
      if (name && cellNumber(row[3]) !== null) warnings.push(`Unrecognised state name "${name}" skipped.`);
      continue;
    }
    const indexPairs: Array<[string | null, number]> = [
      [periods[0], 3],
      [periods[1], 5],
      [periods[2], 7],
    ];
    for (const [period, column] of indexPairs) {
      if (!period) continue;
      const value = cellNumber(row[column]);
      if (value === null) continue;
      observations.push(
        blankDraft({
          indicatorId: "cpi.all_items.index.state",
          value,
          unit: "index",
          period,
          frequency: "monthly",
          geographyId: iso,
          datasetId: "nbs-cpi",
          sourceUrl: CPI_FILE,
          publicationTitle: CPI_PUBLICATION,
          revisionId: CPI_REVISION,
          methodology: CPI_METHODOLOGY,
        }),
      );
    }
    const yoy = cellNumber(row[9]);
    if (yoy !== null) {
      observations.push(
        blankDraft({
          indicatorId: "cpi.all_items.yoy.state",
          value: yoy,
          unit: "percent",
          period: latest,
          frequency: "monthly",
          geographyId: iso,
          datasetId: "nbs-cpi",
          sourceUrl: CPI_FILE,
          publicationTitle: CPI_PUBLICATION,
          revisionId: CPI_REVISION,
          methodology: `${CPI_METHODOLOGY} State year-on change is the All Items annual-change column of Table 5 and applies only to ${latest}.`,
        }),
      );
    }
  }

  const stateCount = new Set(observations.filter((item) => item.indicatorId === "cpi.all_items.yoy.state").map((item) => item.geographyId)).size;
  if (stateCount !== 37) {
    throw new Error(`Expected year-on change for 37 states, read ${stateCount}.`);
  }
  return { observations, warnings };
}

export function shapeNameFor(stateName: string): string {
  return SHAPE_NAME[stateName] ?? stateName;
}

export function toObservation(draft: DraftObservation, retrievedAt: string): Observation {
  return {
    ...draft,
    id: observationId(draft.indicatorId, draft.geographyId, draft.period, draft.revisionId),
    retrievedAt,
  };
}
