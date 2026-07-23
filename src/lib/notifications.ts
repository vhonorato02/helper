import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { notificationPreferences, notifications, users } from '@/db/schema';
import { logger } from '@/lib/logger';
import { normalizeInternalNotificationLink } from '@/lib/notification-links';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabledForAlerts,
} from '@/lib/notification-preferences';
import { sendPushNotificationToUsers } from '@/lib/web-push';

async function filterUserIdsByAlertPreference(userIds: string[], type: string) {
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
    return isNotificationTypeEnabledForAlerts(type, preferences);
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

    const link = normalizeInternalNotificationLink(input.link);
    const title = input.title.trim().slice(0, 180);
    const body = input.body?.trim().slice(0, 1000) || null;
    if (!title) return;

    await db.insert(notifications).values(
      userIds.map((userId) => ({
        userId,
        type: input.type.slice(0, 80),
        title,
        body,
        link,
        ticketId: input.ticketId ?? null,
      })),
    );

    const enabledUserIds = await filterUserIdsByAlertPreference(userIds, input.type);
    if (enabledUserIds.length === 0) return;

    await sendPushNotificationToUsers({
      userIds: enabledUserIds,
      payload: {
        title,
        body,
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
