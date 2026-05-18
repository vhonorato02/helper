import { describe, expect, it } from 'vitest';
import {
  passwordSchema,
  PASSWORD_MIN_LENGTH,
  usernameSchema,
  ticketCodeSchema,
} from '@/lib/validation';

describe('validation schemas', () => {
  it('rejects passwords shorter than the minimum', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true);
  });

  it('normalizes usernames to lowercase and enforces pattern', () => {
    const parsed = usernameSchema.parse('  Vitor.Honorato ');
    expect(parsed).toBe('vitor.honorato');
    expect(usernameSchema.safeParse('with space').success).toBe(false);
    expect(usernameSchema.safeParse('weird!').success).toBe(false);
  });

  it('uppercases and validates ticket codes', () => {
    expect(ticketCodeSchema.parse(' ti-0042 ')).toBe('TI-0042');
    expect(ticketCodeSchema.safeParse('TI-').success).toBe(false);
    expect(ticketCodeSchema.safeParse('XYZ-1').success).toBe(false);
  });
});
