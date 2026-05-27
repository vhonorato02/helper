import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  passwordSchema,
  PASSWORD_MIN_LENGTH,
  usernameSchema,
  ticketCodeSchema,
} from '@/lib/validation';

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
});
