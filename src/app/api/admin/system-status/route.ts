import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { chromebookBookings, tickets, users, schedules } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { APP_VERSION_LABEL } from '@/lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const startedAt = Date.now();

  // Conectividade do banco
  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  // Contagens gerais
  let counts = { tickets: 0, users: 0, schedules: 0, chromebookBookings: 0 };
  try {
    const [row] = await db
      .select({
        tickets: sql<number>`(select count(*) from ${tickets})`,
        users: sql<number>`(select count(*) from ${users} where ${users.isActive})`,
        schedules: sql<number>`(select count(*) from ${schedules})`,
        chromebookBookings: sql<number>`(select count(*) from ${chromebookBookings})`,
      })
      .from(sql`(select 1) AS dummy`);
    counts = {
      tickets: Number(row?.tickets ?? 0),
      users: Number(row?.users ?? 0),
      schedules: Number(row?.schedules ?? 0),
      chromebookBookings: Number(row?.chromebookBookings ?? 0),
    };
  } catch {
    dbOk = false;
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    env: {
      app: APP_VERSION_LABEL,
      node: process.version,
      vercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION ?? 'local',
    },
    database: {
      ok: dbOk,
      latencyMs: dbLatencyMs,
    },
    email: {
      gmail: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD,
      cronSecret: !!process.env.CRON_SECRET,
      recipients: {
        general: (process.env.NOTIFICATION_TO_EMAILS ?? '').split(/[;,]/).filter(Boolean).length,
        ti: (process.env.NOTIFICATION_TI_EMAILS ?? '').split(/[;,]/).filter(Boolean).length,
      },
    },
    counts: {
      tickets: counts.tickets,
      activeUsers: counts.users,
      schedules: counts.schedules,
      chromebookBookings: counts.chromebookBookings,
    },
  });
}
