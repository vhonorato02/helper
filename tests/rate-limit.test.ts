import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

describe('rate limit (sliding window)', () => {
  it('allows up to limit hits inside the window then blocks', () => {
    const key = 'test:basic';
    resetRateLimit(key);
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit({ key, limit: 3, windowMs: 60_000 });
      assert.equal(result.ok, true);
    }
    const blocked = checkRateLimit({ key, limit: 3, windowMs: 60_000 });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.remaining, 0);
  });

  it('applies a lockout when configured', () => {
    const key = 'test:lockout';
    resetRateLimit(key);
    for (let i = 0; i < 2; i++) {
      assert.equal(checkRateLimit({ key, limit: 2, windowMs: 1_000, lockoutMs: 60_000 }).ok, true);
    }
    const result = checkRateLimit({ key, limit: 2, windowMs: 1_000, lockoutMs: 60_000 });
    assert.equal(result.ok, false);
    assert.ok(result.retryAfterMs > 30_000);
  });
});
