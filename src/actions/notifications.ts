'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { notificationPreferences, notifications } from '@/db/schema';
import {
  countMyPushSubscriptions,
  getPublicVapidKey,
  hasPushSubscriptionForUser,
  isValidPushEndpoint,
  normalizePushSubscriptionPayload,
  pruneExpiredPushSubscriptions,
  removePushSubscription,
  upsertPushSubscription,
} from '@/lib/web-push';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notification-preferences';
import { requireAuth } from '@/lib/auth-helpers';
import { boundedInteger } from '@/lib/validation';

const notificationIdSchema = z.string().uuid();

const preferenceSchema = {
  ticket_created: 'ticketCreated',
  ticket_status: 'ticketStatus',
  comment_mention: 'commentMention',
  daily_digest: 'dailyDigest',
  email_enabled: 'emailEnabled',
  browser_enabled: 'browserEnabled',
} as const;

type PreferenceKey = (typeof preferenceSchema)[keyof typeof preferenceSchema];

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
  limit = boundedInteger(limit, { min: 1, max: 100, fallback: 40 });
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
  const parsedId = notificationIdSchema.safeParse(id);
  if (!parsedId.success) return { error: 'Notificação inválida.' };
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, parsedId.data), eq(notifications.userId, user.id)));
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

  await pruneExpiredPushSubscriptions();

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
  const cutoff = boundedInteger(days, { min: 30, max: 365, fallback: 90 });
  const deleted = await db
    .delete(notifications)
    .where(sql`${notifications.readAt} IS NOT NULL AND ${notifications.readAt} < now() - make_interval(days => ${cutoff})`)
    .returning({ id: notifications.id });

  return { ok: true, deleted: deleted.length };
}
