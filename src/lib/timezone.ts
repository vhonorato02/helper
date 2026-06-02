import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'America/Sao_Paulo';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
