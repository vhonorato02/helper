import { NextResponse } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import { sendImminentScheduleReminder, sendOverdueNudge } from '@/lib/reminders';
import { logger } from '@/lib/logger';
import { runCronTasks } from '@/lib/cron-runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron orquestrador da tarde (consolida para caber no Hobby plan).
 * Roda dias uteis as 20h UTC (17h BRT).
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const result = await runCronTasks([
    { name: 'overdueNudge', run: sendOverdueNudge },
    { name: 'scheduleImminent', run: sendImminentScheduleReminder },
  ]);

  logger.info('cron_afternoon_complete', { result });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
