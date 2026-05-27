import { NextResponse } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import {
  autoArchiveOldResolved,
  autoMoveStaleToWaiting,
  sendDailyDigest,
  sendPfPreventiveReminder,
  sendStaleNudge,
  sendWeeklySummary,
} from '@/lib/reminders';
import { logger } from '@/lib/logger';
import { toZonedTime } from 'date-fns-tz';
import { APP_TIMEZONE } from '@/lib/timezone';
import { pruneReadNotifications } from '@/actions/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron orquestrador da manha (consolida varias tarefas em 1 endpoint para caber no Hobby plan).
 * Roda diariamente as 11h UTC (8h BRT).
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const zoned = toZonedTime(new Date(), APP_TIMEZONE);
  const dayOfWeek = zoned.getDay(); // 0 = domingo (America/Sao_Paulo)
  const dayOfMonth = zoned.getDate();
  const month = zoned.getMonth(); // 0 = janeiro

  const results: Record<string, unknown> = {};

  // Tarefas diarias
  results.digest = await sendDailyDigest();
  results.autoArchive = await autoArchiveOldResolved();
  results.autoStale = await autoMoveStaleToWaiting();

  // Tarefas semanais (segunda-feira)
  if (dayOfWeek === 1) {
    results.weeklySummary = await sendWeeklySummary();
    results.staleNudge = await sendStaleNudge();
  }

  // Trimestral (dia 1 de jan/abr/jul/out)
  if (dayOfMonth === 1 && [0, 3, 6, 9].includes(month)) {
    results.pfPreventive = await sendPfPreventiveReminder();
  }

  // Mensal: remove notificações lidas antigas sem criar outro cron no Vercel.
  if (dayOfMonth === 1) {
    results.notificationsCleanup = await pruneReadNotifications();
  }

  logger.info('cron_morning_complete', { results });
  return NextResponse.json({ ok: true, results });
}
