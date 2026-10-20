export type Cell = string | number | boolean | Date | null | undefined | { result?: unknown; richText?: Array<{ text?: string }>; text?: string };

function unwrap(value: Cell): Cell {
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value && value.result !== undefined) return unwrap(value.result as Cell);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? "").join("");
    if ("text" in value && typeof value.text === "string") return value.text;
    return null;
  }
  return value;
}

export function cellNumber(value: Cell): number | null {
  const raw = unwrap(value);
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "boolean" || raw instanceof Date) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? round6(raw) : null;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text === "-" || text.toLowerCase() === "na" || text.toLowerCase() === "n/a") return null;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? round6(parsed) : null;
}

export function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function cellText(value: Cell): string {
  const raw = unwrap(value);
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw).replace(/\s+/g, " ").trim();
  }
  return "";
}

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function monthToken(value: Cell): string | null {
  const text = cellText(value).toLowerCase().replace(".", "");
  return MONTHS[text] ?? null;
}

export function yearToken(value: Cell): number | null {
  if (typeof value === "number" && value >= 1900 && value <= 2100) return Math.trunc(value);
  const text = cellText(value);
  if (/^\d{4}$/.test(text)) return Number(text);
  return null;
}

export function monthPeriodFromCell(value: Cell): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  const text = cellText(value);
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return null;
}

export function observationId(indicatorId: string, geographyId: string, period: string, revisionId: string): string {
  return `${indicatorId}|${geographyId}|${period}|${revisionId}`;
}
