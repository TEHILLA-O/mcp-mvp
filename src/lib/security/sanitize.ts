const SECRET = /token|secret|password|authorization|api[_-]?key|database_url/i;

export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) {
    const sliced = value.slice(0, 400).map((item) => sanitize(item, depth + 1));
    if (value.length > 400) sliced.push(`[${value.length - 400} more items]`);
    return sliced;
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SECRET.test(key) ? "[redacted]" : sanitize(entry, depth + 1);
    }
    return output;
  }
  return value;
}

export function jsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}
