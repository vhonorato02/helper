import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type SessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  name?: string | null;
  mustChangePassword?: boolean;
};

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

export async function requireAuth(options?: { allowPasswordChange?: boolean }): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await loadActiveUser(session.user.id);
  if (!user) redirect('/login');

  if (user.mustChangePassword && !options?.allowPasswordChange) {
    redirect('/alterar-senha');
  }

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isAdmin) redirect('/');
  return user;
}

export async function requireAdminAction(): Promise<SessionUser | null> {
  const user = await requireAuth();
  if (!user.isAdmin) return null;
  return user;
}
