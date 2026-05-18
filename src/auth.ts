import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { db } from './db';
import { authEvents, users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const credentialsSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(256),
});

const LOGIN_LIMIT_PER_IP = { limit: 8, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };
const LOGIN_LIMIT_PER_USER = { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };

function extractIp(request: Request | undefined) {
  if (!request) return 'unknown';
  const h = request.headers;
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'unknown';
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
    // Never let audit logging block authentication.
    logger.warn('auth_event_insert_failed', { error: String(error) });
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: copy.auth.credentials.username },
        password: { label: copy.auth.credentials.password, type: 'password' },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ip = extractIp(request);
        const ua = request?.headers?.get('user-agent') ?? null;
        const username = parsed.data.username.trim().toLowerCase();

        const ipLimit = checkRateLimit({ key: `login:ip:${ip}`, ...LOGIN_LIMIT_PER_IP });
        const userLimit = checkRateLimit({ key: `login:user:${username}`, ...LOGIN_LIMIT_PER_USER });

        if (!ipLimit.ok || !userLimit.ok) {
          await recordAuthEvent({
            type: 'login_rate_limited',
            username,
            ip,
            userAgent: ua,
            detail: !ipLimit.ok ? 'ip_blocked' : 'user_blocked',
          });
          logger.warn('login_rate_limited', { ip, username });
          return null;
        }

        // Explicit column list avoids SELECT * crashing when the DB schema is
        // ahead of the deployed migration (e.g. new columns not yet in prod).
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            passwordHash: users.passwordHash,
            isAdmin: users.isAdmin,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.username, username))
          .limit(1)
          .catch(() => [null]);

        if (!user || !user.isActive) {
          await recordAuthEvent({
            type: 'login_failure',
            username,
            ip,
            userAgent: ua,
            detail: user ? 'inactive' : 'unknown_user',
          });
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await recordAuthEvent({
            type: 'login_failure',
            userId: user.id,
            username,
            ip,
            userAgent: ua,
            detail: 'bad_password',
          });
          return null;
        }

        // Best-effort: update lastLoginAt without breaking the login flow.
        try {
          await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
        } catch (error) {
          logger.warn('last_login_update_failed', { userId: user.id, error: String(error) });
        }

        await recordAuthEvent({ type: 'login_success', userId: user.id, username, ip, userAgent: ua });

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
});
