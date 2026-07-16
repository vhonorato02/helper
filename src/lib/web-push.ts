import crypto from 'node:crypto';
import webPush from 'web-push';
import { and, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notificationPreferences, pushSubscriptions } from '@/db/schema';
import { logger } from '@/lib/logger';

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushMessagePayload = {
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string | null;
};

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 500;

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function configureVapid() {
  if (vapidConfigured) return true;

  const config = getVapidConfig();
  if (!config) return false;

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  vapidConfigured = true;
  return true;
}

function endpointFingerprint(endpoint: string) {
  return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

function isGoneWebPushError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export function getPublicVapidKey() {
  return getVapidConfig()?.publicKey ?? null;
}

export function normalizePushSubscriptionPayload(
  subscription: unknown,
): PushSubscriptionPayload | null {
  if (!subscription || typeof subscription !== 'object') return null;
  const value = subscription as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  if (typeof value.endpoint !== 'string') return null;
  if (!value.endpoint.startsWith('https://') || value.endpoint.length > MAX_ENDPOINT_LENGTH) {
    return null;
  }
  const p256dh = value.keys?.p256dh;
  const auth = value.keys?.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (p256dh.length === 0 || p256dh.length > MAX_KEY_LENGTH) return null;
  if (auth.length === 0 || auth.length > MAX_KEY_LENGTH) return null;
  if (value.expirationTime !== null && value.expirationTime !== undefined) {
    if (typeof value.expirationTime !== 'number' || !Number.isFinite(value.expirationTime)) return null;
  }

  return {
    endpoint: value.endpoint,
    expirationTime: typeof value.expirationTime === 'number' ? value.expirationTime : null,
    keys: {
      p256dh,
      auth,
    },
  };
}

export async function upsertPushSubscription(input: {
  userId: string;
  subscription: PushSubscriptionPayload;
  userAgent?: string | null;
}) {
  await db
    .insert(pushSubscriptions)
    .values({
      userId: input.userId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      expirationTime: input.subscription.expirationTime
        ? new Date(input.subscription.expirationTime)
        : null,
      userAgent: input.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: input.userId,
        p256dh: input.subscription.keys.p256dh,
        auth: input.subscription.keys.auth,
        expirationTime: input.subscription.expirationTime
          ? new Date(input.subscription.expirationTime)
          : null,
        userAgent: input.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
        lastSeenAt: new Date(),
      },
    });
}

export async function removePushSubscription(input: { userId: string; endpoint: string }) {
  if (!input.endpoint) return { deleted: 0 };
  const deleted = await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.userId, input.userId), eq(pushSubscriptions.endpoint, input.endpoint)),
    )
    .returning({ id: pushSubscriptions.id });
  return { deleted: deleted.length };
}

export async function pruneExpiredPushSubscriptions() {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(
      and(
        isNotNull(pushSubscriptions.expirationTime),
        lt(pushSubscriptions.expirationTime, new Date()),
      ),
    )
    .returning({ id: pushSubscriptions.id });

  return { deleted: deleted.length };
}

export async function sendPushNotificationToUsers(input: {
  userIds: string[];
  payload: PushMessagePayload;
}) {
  const userIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (userIds.length === 0) return { sent: 0, removed: 0, skipped: 'no_users' as const };
  if (!configureVapid()) return { sent: 0, removed: 0, skipped: 'vapid_missing' as const };

  await pruneExpiredPushSubscriptions();

  const rows = await db
    .select({
      id: pushSubscriptions.id,
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      browserEnabled: notificationPreferences.browserEnabled,
    })
    .from(pushSubscriptions)
    .leftJoin(
      notificationPreferences,
      eq(notificationPreferences.userId, pushSubscriptions.userId),
    )
    .where(inArray(pushSubscriptions.userId, userIds));

  const payload = JSON.stringify({
    title: input.payload.title,
    body: input.payload.body ?? '',
    link: input.payload.link ?? '/notificacoes',
    tag: input.payload.tag ?? undefined,
  });

  let sent = 0;
  const expiredIds: string[] = [];

  for (const row of rows) {
    if (row.browserEnabled === false) continue;

    try {
      await webPush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
      );
      sent += 1;
    } catch (error) {
      if (isGoneWebPushError(error)) {
        expiredIds.push(row.id);
        continue;
      }
      logger.warn('push_notification_failed', {
        subscription: endpointFingerprint(row.endpoint),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (expiredIds.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, expiredIds));
  }

  return { sent, removed: expiredIds.length, skipped: null };
}

export async function countMyPushSubscriptions(userId: string) {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return row?.value ?? 0;
}
