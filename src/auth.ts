import { cookies } from 'next/headers';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  AUTH_COOKIE_NAME,
  type SessionUser,
  verifySessionToken,
} from '@/lib/session';

let authProfileSchemaPromise: Promise<void> | null = null;

async function ensureAuthProfileSchema() {
  authProfileSchemaPromise ??= (async () => {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS area area`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`);
  })();
  return authProfileSchemaPromise;
}

async function loadActiveUser(userId: string): Promise<SessionUser | null> {
  await ensureAuthProfileSchema();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      avatarUrl: users.avatarUrl,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.isActive) return null;

  return {
    id: row.id,
    username: row.username,
    isAdmin: row.isAdmin,
    name: row.displayName,
    role: row.role,
    area: row.area,
    avatarUrl: row.avatarUrl,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function auth() {
  const cookieStore = await cookies();
  const claims = await verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!claims?.sub) return null;

  const user = await loadActiveUser(claims.sub);
  return user ? { user } : null;
}

export type { SessionUser };
