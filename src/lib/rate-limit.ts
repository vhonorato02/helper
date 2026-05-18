// Lightweight in-memory sliding-window rate limiter.
// Works for a single instance (good baseline; replace with Redis/Upstash for HA).

type Entry = { hits: number[]; lockedUntil?: number };

const buckets = new Map<string, Entry>();

const HOUR = 60 * 60 * 1000;

// Eviction guard so the map doesn't grow unbounded.
function gc(now: number) {
  if (buckets.size < 2000) return;
  for (const [key, entry] of buckets) {
    const stale = entry.hits.every((t) => now - t > HOUR) && (!entry.lockedUntil || entry.lockedUntil < now);
    if (stale) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimitOptions {
  /** Bucket key — usually `${prefix}:${identifier}`. */
  key: string;
  /** Max requests inside the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Optional cooldown applied when the limit is exceeded. */
  lockoutMs?: number;
}

export function checkRateLimit({ key, limit, windowMs, lockoutMs = 0 }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  gc(now);
  const entry = buckets.get(key) ?? { hits: [] };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterMs: entry.lockedUntil - now };
  }

  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= limit) {
    if (lockoutMs > 0) entry.lockedUntil = now + lockoutMs;
    buckets.set(key, entry);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: entry.lockedUntil ? entry.lockedUntil - now : windowMs - (now - entry.hits[0]),
    };
  }

  entry.hits.push(now);
  entry.lockedUntil = undefined;
  buckets.set(key, entry);
  return { ok: true, remaining: limit - entry.hits.length, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
