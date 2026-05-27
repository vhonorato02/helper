import { NextResponse } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import { autoArchiveOldResolved } from '@/lib/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;
  const result = await autoArchiveOldResolved();
  return NextResponse.json({ ok: true, ...result });
}
