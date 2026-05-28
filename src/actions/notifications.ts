'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { notificationPreferences, notifications, users } from '@/db/schema';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

let notificationSchemaPromise: Promise<void> | null = null;

async function ensureNotificationSchema() {
  notificationSchemaPromise ??= (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL,
        body text,
        link text,
        ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
        read_at timestamp,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
      ON notifications (user_id, read_at)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS notifications_created_idx
      ON notifications (created_at)
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        ticket_created boolean NOT NULL DEFAULT true,
        ticket_status boolean NOT NULL DEFAULT true,
        comment_mention boolean NOT NULL DEFAULT true,
        daily_digest boolean NOT NULL DEFAULT true,
        email_enabled boolean NOT NULL DEFAULT true,
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
  })();
  return notificationSchemaPromise;
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
  ticketCreated: true,
  ticketStatus: true,
  commentMention: true,
  dailyDigest: true,
  emailEnabled: true,
};

const preferenceSchema = {
  ticket_created: 'ticketCreated',
  ticket_status: 'ticketStatus',
  comment_mention: 'commentMention',
  daily_digest: 'dailyDigest',
  email_enabled: 'emailEnabled',
} as const;

type PreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

function preferenceForNotificationType(type: string): PreferenceKey | null {
  if (type.includes('status')) return 'ticketStatus';
  if (type.includes('mention') || type.includes('comment')) return 'commentMention';
  if (type.includes('digest')) return 'dailyDigest';
  if (type.includes('ticket') || type.includes('request')) return 'ticketCreated';
  return null;
}

async function filterUserIdsByPreference(userIds: string[], type: string) {
  const preferenceKey = preferenceForNotificationType(type);
  if (!preferenceKey) return userIds;

  const rows = await db
    .select({
      userId: notificationPreferences.userId,
      ticketCreated: notificationPreferences.ticketCreated,
      ticketStatus: notificationPreferences.ticketStatus,
      commentMention: notificationPreferences.commentMention,
      dailyDigest: notificationPreferences.dailyDigest,
      emailEnabled: notificationPreferences.emailEnabled,
    })
    .from(notificationPreferences)
    .where(inArray(notificationPreferences.userId, userIds));

  const preferencesByUser = new Map(rows.map((row) => [row.userId, row]));
  return userIds.filter((userId) => {
    const preferences = preferencesByUser.get(userId) ?? DEFAULT_NOTIFICATION_PREFERENCES;
    return Boolean(preferences[preferenceKey]);
  });
}

export async function dispatchNotification(input: {
  userIds: string[];
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  ticketId?: string | null;
}) {
  const userIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (userIds.length === 0) return;

  await ensureNotificationSchema();
  const enabledUserIds = await filterUserIdsByPreference(userIds, input.type);
  if (enabledUserIds.length === 0) return;

  await db.insert(notifications).values(
    enabledUserIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      ticketId: input.ticketId ?? null,
    })),
  );
}

export async function dispatchNotificationToAdmins(input: {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  ticketId?: string | null;
}) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), eq(users.isActive, true)));
  await dispatchNotification({ ...input, userIds: admins.map((user) => user.id) });
}

export async function getUnreadNotificationCount() {
  const user = await requireAuth();
  await ensureNotificationSchema();
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

export async function getMyNotifications(limit = 40) {
  const user = await requireAuth();
  await ensureNotificationSchema();
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: string) {
  const user = await requireAuth();
  await ensureNotificationSchema();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();
  await ensureNotificationSchema();
  const unread = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  if (unread.length === 0) return { ok: true };

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(inArray(notifications.id, unread.map((item) => item.id)));
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function getNotificationPreferences() {
  const user = await requireAuth();
  await ensureNotificationSchema();

  const [row] = await db
    .select({
      ticketCreated: notificationPreferences.ticketCreated,
      ticketStatus: notificationPreferences.ticketStatus,
      commentMention: notificationPreferences.commentMention,
      dailyDigest: notificationPreferences.dailyDigest,
      emailEnabled: notificationPreferences.emailEnabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1);

  return row ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export type NotificationPreferences = Awaited<ReturnType<typeof getNotificationPreferences>>;

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireAuth();
  await ensureNotificationSchema();

  const next = Object.fromEntries(
    Object.entries(preferenceSchema).map(([fieldName, key]) => [key, formData.has(fieldName)]),
  ) as Record<PreferenceKey, boolean>;

  await db
    .insert(notificationPreferences)
    .values({
      userId: user.id,
      ticketCreated: next.ticketCreated,
      ticketStatus: next.ticketStatus,
      commentMention: next.commentMention,
      dailyDigest: next.dailyDigest,
      emailEnabled: next.emailEnabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        ticketCreated: next.ticketCreated,
        ticketStatus: next.ticketStatus,
        commentMention: next.commentMention,
        dailyDigest: next.dailyDigest,
        emailEnabled: next.emailEnabled,
        updatedAt: new Date(),
      },
    });

  revalidatePath('/configuracoes');
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function pruneReadNotifications(days = 90) {
  await ensureNotificationSchema();
  const cutoff = Math.max(30, Math.min(days, 365));
  const deleted = await db
    .delete(notifications)
    .where(sql`${notifications.readAt} IS NOT NULL AND ${notifications.readAt} < now() - make_interval(days => ${cutoff})`)
    .returning({ id: notifications.id });

  return { ok: true, deleted: deleted.length };
}
