import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { boundedInteger } from '@/lib/validation';

// Internal maintenance only. Never export this through a 'use server' action module.
export async function pruneReadNotifications(days = 90) {
  const cutoff = boundedInteger(days, { min: 30, max: 365, fallback: 90 });
  const deleted = await db
    .delete(notifications)
    .where(sql`${notifications.readAt} IS NOT NULL AND ${notifications.readAt} < now() - make_interval(days => ${cutoff})`)
    .returning({ id: notifications.id });

  return { ok: true, deleted: deleted.length };
}
