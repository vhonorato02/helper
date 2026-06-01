import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validatePublicContact, validatePublicRequestSchedule } from '@/lib/public-requests';

describe('public request contact validation', () => {
  it('requires an external contact', () => {
    const result = validatePublicContact('  ');

    assert.equal(result.ok, false);
  });

  it('normalizes a valid contact', () => {
    assert.deepEqual(validatePublicContact(' escola@example.com '), {
      ok: true,
      contact: 'escola@example.com',
    });
  });
});

describe('public request schedule validation', () => {
  const now = new Date('2026-06-01T12:00:00-03:00');

  it('allows requests without schedule fields', () => {
    assert.deepEqual(validatePublicRequestSchedule({}, { now }), { ok: true });
  });

  it('rejects partial schedule fields', () => {
    const result = validatePublicRequestSchedule(
      { desiredDate: '2026-06-02', startTime: '09:00' },
      { now },
    );

    assert.equal(result.ok, false);
  });

  it('rejects an end time before the start time', () => {
    const result = validatePublicRequestSchedule(
      { desiredDate: '2026-06-02', startTime: '10:00', endTime: '09:30' },
      { now },
    );

    assert.equal(result.ok, false);
  });

  it('rejects past dates in Sao Paulo', () => {
    const result = validatePublicRequestSchedule(
      { desiredDate: '2026-05-31', startTime: '10:00', endTime: '11:00' },
      { now },
    );

    assert.equal(result.ok, false);
  });

  it('accepts complete future schedules', () => {
    const result = validatePublicRequestSchedule(
      { desiredDate: '2026-06-02', startTime: '10:00', endTime: '11:00' },
      { now },
    );

    assert.deepEqual(result, { ok: true });
  });
});
