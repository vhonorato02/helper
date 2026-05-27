import { NextResponse } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import { sendImminentScheduleReminder, sendOverdueNudge } from '@/lib/reminders';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron orquestrador da tarde (consolida para caber no Hobby plan).
 * Roda dias uteis as 20h UTC (17h BRT).
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const results: Record<string, unknown> = {};
  results.overdueNudge = await sendOverdueNudge();
  results.scheduleImminent = await sendImminentScheduleReminder();

  logger.info('cron_afternoon_complete', { results });
  return NextResponse.json({ ok: true, results });
}
