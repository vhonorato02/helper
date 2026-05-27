import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DATE_FORMATS, daysUntil, formatPtBrDate } from '@/lib/format';

describe('format helpers', () => {
  it('formats date values for native date inputs', () => {
    assert.equal(formatPtBrDate('2026-05-19T12:00:00.000Z', DATE_FORMATS.dateInput), '2026-05-19');
  });

  it('calculates due date distance using calendar days', () => {
    assert.equal(daysUntil('2026-05-20T12:00:00.000Z', new Date('2026-05-19T23:30:00.000Z')), 1);
    assert.equal(daysUntil('2026-05-18T12:00:00.000Z', new Date('2026-05-19T08:00:00.000Z')), -1);
  });
});
