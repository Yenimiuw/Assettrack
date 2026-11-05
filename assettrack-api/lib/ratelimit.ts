// Per-instance, best-effort limiter. It stops runaway loops from one device, but serverless
// instances don't share memory. For hard limits, swap this for Upstash Redis (same signature).
const buckets = new Map<string, { n: number; reset: number }>();

/** Returns 0 if allowed, otherwise the number of seconds to wait. */
export function rateLimit(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n++;
  return b.n > max ? Math.ceil((b.reset - now) / 1000) : 0;
}
