const OBSERVATION_KEEP = 16;

export function compactForModel(value: unknown, depth = 0): unknown {
  if (depth > 6) return null;
  if (Array.isArray(value)) {
    if (value.length <= OBSERVATION_KEEP) return value.map((item) => compactForModel(item, depth + 1));
    return {
      count: value.length,
      omitted: value.length - OBSERVATION_KEEP,
      first: value.slice(0, 2).map((item) => compactForModel(item, depth + 1)),
      last: value.slice(-OBSERVATION_KEEP).map((item) => compactForModel(item, depth + 1)),
    };
  }
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (key === "methodology" && typeof item === "string" && item.length > 280) {
      next[key] = `${item.slice(0, 280)}…`;
      continue;
    }
    next[key] = compactForModel(item, depth + 1);
  }
  return next;
}

export function parseToolArguments(raw: string): Record<string, unknown> | null {
  if (raw.length > 4000) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface ChatSeries {
  label: string;
  unit: string;
  points: Array<{ period: string; value: number }>;
}

export function seriesFromResult(result: unknown): ChatSeries | null {
  if (!result || typeof result !== "object") return null;
  const record = result as { indicator?: { shortName?: string; name?: string }; unit?: string; observations?: Array<{ period?: string; value?: number }> };
  if (!Array.isArray(record.observations) || record.observations.length === 0) return null;
  const points = record.observations.filter((item): item is { period: string; value: number } => typeof item.period === "string" && typeof item.value === "number");
  if (points.length === 0) return null;
  return {
    label: record.indicator?.shortName || record.indicator?.name || "Series",
    unit: record.unit || "",
    points,
  };
}
