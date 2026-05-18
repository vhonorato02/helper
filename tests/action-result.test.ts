import { describe, expect, it } from 'vitest';
import { ok, fail, isError } from '@/lib/action-result';

describe('action result helpers', () => {
  it('builds success without data', () => {
    expect(ok()).toEqual({ ok: true });
  });

  it('builds success with data', () => {
    const result = ok({ code: 'TI-0001' });
    expect(result).toEqual({ ok: true, data: { code: 'TI-0001' } });
  });

  it('builds errors and narrows via isError', () => {
    const result = fail('boom');
    expect(result).toEqual({ ok: false, error: 'boom' });
    expect(isError(result)).toBe(true);
    expect(isError(ok())).toBe(false);
  });
});
