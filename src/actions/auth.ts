'use server';

import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/db';
import { authEvents, users } from '@/db/schema';
import { copy } from '@/lib/copy';
import { logger } from '@/lib/logger';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import {
  AUTH_COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
} from '@/lib/session';

const credentialsSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(256),
});

const LOGIN_LIMIT_PER_IP = { limit: 8, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };
const LOGIN_LIMIT_PER_USER = { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };

async function getRequestMeta() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for');

  return {
    ip: forwarded?.split(',')[0]?.trim() ||
      requestHeaders.get('x-real-ip') ||
      requestHeaders.get('cf-connecting-ip') ||
      'unknown',
    userAgent: requestHeaders.get('user-agent'),
  };
}

async function recordAuthEvent(params: {
  type: 'login_success' | 'login_failure' | 'login_rate_limited';
  userId?: string | null;
  username?: string | null;
  ip?: string;
  userAgent?: string | null;
  detail?: string;
}) {
  try {
    await db.insert(authEvents).values({
      type: params.type,
      userId: params.userId ?? null,
      username: params.username ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      detail: params.detail ?? null,
    });
  } catch (error) {
    logger.warn('auth_event_insert_failed', { error: String(error) });
  }
}

export async function loginAction(input: { username: string; password: string }) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { error: copy.auth.errors.invalidCredentials };

  const { ip, userAgent } = await getRequestMeta();
  const username = parsed.data.username.trim().toLowerCase();
  const ipLimit = checkRateLimit({ key: `login:ip:${ip}`, ...LOGIN_LIMIT_PER_IP });
  const userLimit = checkRateLimit({ key: `login:user:${username}`, ...LOGIN_LIMIT_PER_USER });

  if (!ipLimit.ok || !userLimit.ok) {
    await recordAuthEvent({
      type: 'login_rate_limited',
      username,
      ip,
      userAgent,
      detail: !ipLimit.ok ? 'ip_blocked' : 'user_blocked',
    });
    logger.warn('login_rate_limited', { ip, username });
    return { error: copy.validation.rateLimited };
  }

  let user:
    | {
        id: string;
        username: string;
        displayName: string;
        passwordHash: string;
        isAdmin: boolean;
        isActive: boolean;
        mustChangePassword: boolean;
      }
    | undefined;

  try {
    [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        passwordHash: users.passwordHash,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        mustChangePassword: users.mustChangePassword,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
  } catch (error) {
    logger.error('auth_user_lookup_failed', { username, error: String(error) });
    return { error: copy.validation.serverError };
  }

  if (!user || !user.isActive) {
    await recordAuthEvent({
      type: 'login_failure',
      username,
      ip,
      userAgent,
      detail: user ? 'inactive' : 'unknown_user',
    });
    return { error: copy.auth.errors.invalidCredentials };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordAuthEvent({
      type: 'login_failure',
      userId: user.id,
      username,
      ip,
      userAgent,
      detail: 'bad_password',
    });
    return { error: copy.auth.errors.invalidCredentials };
  }

  try {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  } catch (error) {
    logger.warn('last_login_update_failed', { userId: user.id, error: String(error) });
  }

  await recordAuthEvent({ type: 'login_success', userId: user.id, username, ip, userAgent });
  resetRateLimit(`login:user:${username}`);

  const token = await signSessionToken({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    name: user.displayName,
    mustChangePassword: user.mustChangePassword,
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());

  return { ok: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return { ok: true };
}
