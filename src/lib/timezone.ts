import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'America/Sao_Paulo';

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
