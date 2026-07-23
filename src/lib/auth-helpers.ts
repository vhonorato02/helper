import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import type { SessionUser } from '@/lib/session';

export type { SessionUser };

export async function requireAuth(options?: { allowPasswordChange?: boolean }): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const user = session.user;

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
