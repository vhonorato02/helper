import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  AUTH_COOKIE_NAME,
  type SessionUser,
  verifySessionToken,
} from '@/lib/session';

async function loadActiveUser(userId: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
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
