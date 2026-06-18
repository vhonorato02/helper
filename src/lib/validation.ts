import { z } from 'zod';
import { copy } from '@/lib/copy';

export const userIdSchema = z.string().uuid();

export const usernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9._-]+$/, copy.validation.usernamePattern),
  );

export const displayNameSchema = z.string().trim().min(2).max(80);

export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, copy.validation.passwordTooShort)
  .max(128);

export const currentPasswordSchema = z.string().min(1, copy.validation.passwordCurrentRequired).max(128);

export const ticketCodeSchema = z
  .string()
  .trim()
  .regex(/^(TI|MKT|PF)-\d{1,6}$/i, copy.validation.invalidTicket)
  .transform((value) => value.toUpperCase());

export function isValidMonthDay(month: number, day: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;

  // Leap year keeps 29/02 valid for recurring institutional dates.
  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
