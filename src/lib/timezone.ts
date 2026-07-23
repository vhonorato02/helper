import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'America/Sao_Paulo';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidDateInput(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isValidTimeInput(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Interpreta um datetime-local do navegador no fuso institucional. */
export function parseAppLocalDateTime(value: string): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = `${match[4]}:${match[5]}`;
  if (!isValidDateInput(date) || !isValidTimeInput(time)) return null;

  const parsed = fromZonedTime(`${value}:00`, APP_TIMEZONE);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Início do dia civil no fuso da aplicação (retorno em UTC). */
export function appDayStart(offsetDays = 0, ref = new Date()): Date {
  const zoned = toZonedTime(ref, APP_TIMEZONE);
  zoned.setHours(0, 0, 0, 0);
  zoned.setDate(zoned.getDate() + offsetDays);
  return fromZonedTime(zoned, APP_TIMEZONE);
}

/** Fim exclusivo do dia civil no fuso da aplicação (meia-noite do dia seguinte). */
export function appDayEnd(offsetDays = 0, ref = new Date()): Date {
  return appDayStart(offsetDays + 1, ref);
}

export function appCurrentHour(ref = new Date()): number {
  return toZonedTime(ref, APP_TIMEZONE).getHours();
}

export function appCurrentMonth(ref = new Date()): number {
  return toZonedTime(ref, APP_TIMEZONE).getMonth() + 1;
}

export function appCivilDayDistance(date: Date | string, ref = new Date()): number {
  const target =
    typeof date === 'string' && DATE_ONLY_PATTERN.test(date)
      ? fromZonedTime(`${date}T12:00:00`, APP_TIMEZONE)
      : new Date(date);
  const targetStart = appDayStart(0, target);
  const refStart = appDayStart(0, ref);
  return Math.round((targetStart.getTime() - refStart.getTime()) / DAY_MS);
}
