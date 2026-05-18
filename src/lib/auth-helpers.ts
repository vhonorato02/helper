import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export type SessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  name?: string | null;
};

export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user as SessionUser;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isAdmin) redirect('/');
  return user;
}

export async function requireAdminAction(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.isAdmin) return null;
  return session.user as SessionUser;
}
