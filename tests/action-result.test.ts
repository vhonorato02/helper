import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ok, fail, isError } from '@/lib/action-result';

describe('action result helpers', () => {
  it('builds success without data', () => {
    assert.deepEqual(ok(), { ok: true });
  });

  it('builds success with data', () => {
    const result = ok({ code: 'TI-0001' });
    assert.deepEqual(result, { ok: true, data: { code: 'TI-0001' } });
  });

  it('builds errors and narrows via isError', () => {
    const result = fail('boom');
    assert.deepEqual(result, { ok: false, error: 'boom' });
    assert.equal(isError(result), true);
    assert.equal(isError(ok()), false);
  });
});
