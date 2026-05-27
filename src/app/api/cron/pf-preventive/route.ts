import { NextResponse } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import { sendPfPreventiveReminder } from '@/lib/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;
  const result = await sendPfPreventiveReminder();
  return NextResponse.json({ ok: true, ...result });
}
