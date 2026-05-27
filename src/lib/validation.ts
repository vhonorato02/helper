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
