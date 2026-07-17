'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { notificationPreferences, notifications, users } from '@/db/schema';
import { logger } from '@/lib/logger';
import { normalizeInternalNotificationLink } from '@/lib/notification-links';
import {
  countMyPushSubscriptions,
  getPublicVapidKey,
  hasPushSubscriptionForUser,
  isValidPushEndpoint,
  normalizePushSubscriptionPayload,
  removePushSubscription,
  sendPushNotificationToUsers,
  upsertPushSubscription,
} from '@/lib/web-push';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
  ticketCreated: true,
  ticketStatus: true,
  commentMention: true,
  dailyDigest: true,
  emailEnabled: true,
  browserEnabled: true,
  reminderLeadMinutes: 30,
};

const preferenceSchema = {
  ticket_created: 'ticketCreated',
  ticket_status: 'ticketStatus',
  comment_mention: 'commentMention',
  daily_digest: 'dailyDigest',
  email_enabled: 'emailEnabled',
  browser_enabled: 'browserEnabled',
} as const;

type PreferenceKey = (typeof preferenceSchema)[keyof typeof preferenceSchema];

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
      browserEnabled: notificationPreferences.browserEnabled,
      reminderLeadMinutes: notificationPreferences.reminderLeadMinutes,
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
  try {
    const userIds = Array.from(new Set(input.userIds.filter(Boolean)));
    if (userIds.length === 0) return;

    const enabledUserIds = await filterUserIdsByPreference(userIds, input.type);
    if (enabledUserIds.length === 0) return;
    const link = normalizeInternalNotificationLink(input.link);

    await db.insert(notifications).values(
      enabledUserIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link,
        ticketId: input.ticketId ?? null,
      })),
    );

    await sendPushNotificationToUsers({
      userIds: enabledUserIds,
      payload: {
        title: input.title,
        body: input.body,
        link,
        tag: input.ticketId ?? input.type,
      },
    });
  } catch (error) {
    logger.warn('notification_dispatch_failed', {
      type: input.type,
      ticketId: input.ticketId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function dispatchNotificationToAdmins(input: {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  ticketId?: string | null;
}) {
  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isAdmin, true), eq(users.isActive, true)));
    await dispatchNotification({ ...input, userIds: admins.map((user) => user.id) });
  } catch (error) {
    logger.warn('admin_notification_dispatch_failed', {
      type: input.type,
      ticketId: input.ticketId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getUnreadNotificationCount() {
  const user = await requireAuth();
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

export async function getMyNotifications(limit = 40) {
  const user = await requireAuth();
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
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();
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

  const [row] = await db
    .select({
      ticketCreated: notificationPreferences.ticketCreated,
      ticketStatus: notificationPreferences.ticketStatus,
      commentMention: notificationPreferences.commentMention,
      dailyDigest: notificationPreferences.dailyDigest,
      emailEnabled: notificationPreferences.emailEnabled,
      browserEnabled: notificationPreferences.browserEnabled,
      reminderLeadMinutes: notificationPreferences.reminderLeadMinutes,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1);

  return row ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export type NotificationPreferences = Awaited<ReturnType<typeof getNotificationPreferences>>;

export async function getPushRegistrationState(endpoint?: string | null) {
  const user = await requireAuth();
  const normalizedEndpoint = typeof endpoint === 'string' && isValidPushEndpoint(endpoint)
    ? endpoint
    : null;

  return {
    publicKey: getPublicVapidKey(),
    subscriptionCount: await countMyPushSubscriptions(user.id),
    currentEndpointRegistered: normalizedEndpoint
      ? await hasPushSubscriptionForUser({ userId: user.id, endpoint: normalizedEndpoint })
      : false,
  };
}

export async function registerPushSubscription(subscription: unknown) {
  const user = await requireAuth();
  const payload = normalizePushSubscriptionPayload(subscription);

  if (!payload) {
    return { ok: false, error: 'Assinatura push inválida.' };
  }

  const requestHeaders = await headers();
  await upsertPushSubscription({
    userId: user.id,
    subscription: payload,
    userAgent: requestHeaders.get('user-agent'),
  });

  revalidatePath('/configuracoes');
  revalidatePath('/minha-conta');
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function unregisterPushSubscription(endpoint: string) {
  const user = await requireAuth();
  await removePushSubscription({ userId: user.id, endpoint });

  revalidatePath('/configuracoes');
  revalidatePath('/minha-conta');
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireAuth();

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
      browserEnabled: next.browserEnabled,
      reminderLeadMinutes: Math.max(
        0,
        Math.min(Number(formData.get('reminderLeadMinutes') ?? 30) || 30, 1440),
      ),
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
        browserEnabled: next.browserEnabled,
        reminderLeadMinutes: Math.max(
          0,
          Math.min(Number(formData.get('reminderLeadMinutes') ?? 30) || 30, 1440),
        ),
        updatedAt: new Date(),
      },
    });

  revalidatePath('/configuracoes');
  revalidatePath('/minha-conta');
  revalidatePath('/notificacoes');
  return { ok: true };
}

export async function pruneReadNotifications(days = 90) {
  const cutoff = Math.max(30, Math.min(days, 365));
  const deleted = await db
    .delete(notifications)
    .where(sql`${notifications.readAt} IS NOT NULL AND ${notifications.readAt} < now() - make_interval(days => ${cutoff})`)
    .returning({ id: notifications.id });

  return { ok: true, deleted: deleted.length };
}
