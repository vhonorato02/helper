import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatHolidaySummary,
  getHolidayByDate,
  getHolidaySchedulingNotice,
  holidayShortLabels,
} from '@/lib/holidays';

describe('Pindamonhangaba institutional holidays', () => {
  it('finds and labels national and municipal holidays', () => {
    const holiday = getHolidayByDate('2026-04-03');

    assert.equal(holiday?.name, 'Dia da Paixão de Cristo');
    assert.deepEqual(holidayShortLabels(holiday!), ['Nacional', 'Municipal']);
    assert.match(formatHolidaySummary(holiday!), /Feriado nacional/);
  });

  it('marks partial optional workdays without blocking the full day', () => {
    const notice = getHolidaySchedulingNotice('2026-02-18');

    assert.equal(notice?.blocksFullDay, false);
    assert.match(notice?.message ?? '', /segundo período/);
  });

  it('returns no notice for a regular school day', () => {
    assert.equal(getHolidaySchedulingNotice('2026-03-10'), null);
  });

  it('supports the 2027 holiday calendar', () => {
    const holiday = getHolidayByDate('2027-03-26');

    assert.equal(holiday?.name, 'Dia da Paixão de Cristo');
    assert.deepEqual(holidayShortLabels(holiday!), ['Nacional', 'Municipal']);
  });
});
