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
import { runCronTasks, type CronTask } from '@/lib/cron-runner';

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

  const tasks: CronTask[] = [
    { name: 'digest', run: sendDailyDigest },
    { name: 'autoArchive', run: autoArchiveOldResolved },
    { name: 'autoStale', run: autoMoveStaleToWaiting },
  ];

  // Tarefas semanais (segunda-feira)
  if (dayOfWeek === 1) {
    tasks.push(
      { name: 'weeklySummary', run: sendWeeklySummary },
      { name: 'staleNudge', run: sendStaleNudge },
    );
  }

  // Trimestral (dia 1 de jan/abr/jul/out)
  if (dayOfMonth === 1 && [0, 3, 6, 9].includes(month)) {
    tasks.push({ name: 'pfPreventive', run: sendPfPreventiveReminder });
  }

  // Mensal: remove notificações lidas antigas sem criar outro cron no Vercel.
  if (dayOfMonth === 1) {
    tasks.push({ name: 'notificationsCleanup', run: pruneReadNotifications });
  }

  const result = await runCronTasks(tasks);

  logger.info('cron_morning_complete', { result });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
