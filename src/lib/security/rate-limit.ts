const buckets = new Map<string, { tokens: number; updated: number }>();

export function allowRequest(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, updated: now };
  const elapsed = now - bucket.updated;
  const refill = (elapsed / windowMs) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.updated = now;
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
