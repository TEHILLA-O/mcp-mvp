export type Frequency = "monthly" | "quarterly" | "annual";
export type GeographyLevel = "country" | "state";
export type UnitKind = "index" | "percent" | "share";

export interface DataSource {
  id: string;
  publisher: string;
  name: string;
  url: string;
  notes: string;
}

export interface Dataset {
  id: string;
  sourceId: string;
  name: string;
  description: string;
  category: string;
  geography: string;
  frequency: Frequency;
  periodStart: string;
  periodEnd: string;
  sourceUrl: string;
  publicationTitle: string;
  publicationDate: string | null;
  methodology: string;
  limitations: string;
  indicatorIds: string[];
}

export interface Indicator {
  id: string;
  datasetId: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  unit: string;
  unitKind: UnitKind;
  frequency: Frequency;
  geographyLevel: GeographyLevel;
  comparableGroup: string;
  revisionId: string;
  methodology: string;
  aliases: string[];
}

export interface Geography {
  id: string;
  name: string;
  level: GeographyLevel;
  parentId: string | null;
  shapeName: string | null;
}

export interface Revision {
  id: string;
  datasetId: string;
  label: string;
  retrievedAt: string;
  notes: string;
}

export interface Observation {
  id: string;
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
  retrievedAt: string;
  revisionId: string;
  methodology: string;
}

export interface IngestionRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "failed";
  datasets: string[];
  observationCount: number;
  warnings: string[];
  notes: string;
}

export interface Store {
  generatedAt: string;
  sources: DataSource[];
  datasets: Dataset[];
  indicators: Indicator[];
  geographies: Geography[];
  revisions: Revision[];
  observations: Observation[];
  ingestions: IngestionRecord[];
}

export interface SeriesPoint {
  period: string;
  value: number;
  geographyId: string;
  unit: string;
  publicationTitle: string;
  sourceUrl: string;
  retrievedAt: string;
  revisionId: string;
}

export interface StatisticsResult {
  indicator: Indicator;
  geography: Geography;
  frequency: Frequency;
  unit: string;
  unitKind: UnitKind;
  methodology: string;
  observations: SeriesPoint[];
  warnings: string[];
  retrievedAt: string | null;
  sourceUrl: string;
  publicationTitle: string;
  publicationDate: string | null;
}
