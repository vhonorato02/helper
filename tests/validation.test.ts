import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  passwordSchema,
  PASSWORD_MIN_LENGTH,
  usernameSchema,
  ticketCodeSchema,
  isValidMonthDay,
  boundedInteger,
} from '@/lib/validation';
import {
  isValidDateInput,
  isValidTimeInput,
  parseAppLocalDateTime,
} from '@/lib/timezone';

describe('validation schemas', () => {
  it('rejects passwords shorter than the minimum', () => {
    assert.equal(passwordSchema.safeParse('short').success, false);
    assert.equal(passwordSchema.safeParse('a'.repeat(PASSWORD_MIN_LENGTH)).success, true);
  });

  it('normalizes usernames to lowercase and enforces pattern', () => {
    const parsed = usernameSchema.parse('  Vitor.Honorato ');
    assert.equal(parsed, 'vitor.honorato');
    assert.equal(usernameSchema.safeParse('with space').success, false);
    assert.equal(usernameSchema.safeParse('weird!').success, false);
  });

  it('uppercases and validates ticket codes', () => {
    assert.equal(ticketCodeSchema.parse(' ti-0042 '), 'TI-0042');
    assert.equal(ticketCodeSchema.safeParse('TI-').success, false);
    assert.equal(ticketCodeSchema.safeParse('XYZ-1').success, false);
  });

  it('validates real calendar days for recurring dates', () => {
    assert.equal(isValidMonthDay(2, 29), true);
    assert.equal(isValidMonthDay(2, 31), false);
    assert.equal(isValidMonthDay(4, 31), false);
    assert.equal(isValidMonthDay(12, 31), true);
  });

  it('bounds untrusted numeric parameters', () => {
    assert.equal(boundedInteger(-10, { min: 1, max: 100, fallback: 20 }), 1);
    assert.equal(boundedInteger(999, { min: 1, max: 100, fallback: 20 }), 100);
    assert.equal(boundedInteger(Number.NaN, { min: 1, max: 100, fallback: 20 }), 20);
    assert.equal(boundedInteger(7.9, { min: 1, max: 100, fallback: 20 }), 7);
  });

  it('validates and parses browser local datetimes in Sao Paulo', () => {
    assert.equal(isValidDateInput('2026-02-29'), false);
    assert.equal(isValidDateInput('2028-02-29'), true);
    assert.equal(isValidTimeInput('23:59'), true);
    assert.equal(isValidTimeInput('24:00'), false);
    assert.equal(parseAppLocalDateTime('2026-07-23T09:00')?.toISOString(), '2026-07-23T12:00:00.000Z');
    assert.equal(parseAppLocalDateTime('2026-02-30T09:00'), null);
  });
});
