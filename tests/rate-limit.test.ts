import { describe, expect, it } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

describe('rate limit (sliding window)', () => {
  it('allows up to limit hits inside the window then blocks', () => {
    const key = 'test:basic';
    resetRateLimit(key);
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit({ key, limit: 3, windowMs: 60_000 });
      expect(result.ok).toBe(true);
    }
    const blocked = checkRateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('applies a lockout when configured', () => {
    const key = 'test:lockout';
    resetRateLimit(key);
    for (let i = 0; i < 2; i++) {
      expect(checkRateLimit({ key, limit: 2, windowMs: 1_000, lockoutMs: 60_000 }).ok).toBe(true);
    }
    const result = checkRateLimit({ key, limit: 2, windowMs: 1_000, lockoutMs: 60_000 });
    expect(result.ok).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(30_000);
  });
});
