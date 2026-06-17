// Lightweight in-memory sliding-window rate limiter.
// Works for a single instance (good baseline; replace with Redis/Upstash for HA).

import { createHash } from 'node:crypto';

type Entry = { hits: number[]; lockedUntil?: number };

const buckets = new Map<string, Entry>();

const HOUR = 60 * 60 * 1000;
const MAX_KEY_LENGTH = 180;

function normalizeKey(key: string) {
  const normalized = key.replace(/[\r\n\t]+/g, ' ').trim();
  if (!normalized) return 'unknown';
  if (normalized.length <= MAX_KEY_LENGTH) return normalized;

  const digest = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return `${normalized.slice(0, 80)}:${digest}`;
}

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
  const bucketKey = normalizeKey(key);
  gc(now);
  const entry = buckets.get(bucketKey) ?? { hits: [] };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterMs: entry.lockedUntil - now };
  }

  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= limit) {
    if (lockoutMs > 0) entry.lockedUntil = now + lockoutMs;
    buckets.set(bucketKey, entry);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: entry.lockedUntil ? entry.lockedUntil - now : windowMs - (now - entry.hits[0]),
    };
  }

  entry.hits.push(now);
  entry.lockedUntil = undefined;
  buckets.set(bucketKey, entry);
  return { ok: true, remaining: limit - entry.hits.length, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(normalizeKey(key));
}
