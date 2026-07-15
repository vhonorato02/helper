import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getNotificationPreferences } from '@/actions/notifications';
import { getDefaultAssigneeForArea } from '@/actions/users';
import { AccountSettings } from '@/app/configuracoes/account-settings';
import type { Area } from '@/lib/constants';
import { copy } from '@/lib/copy';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: copy.metadata.account,
};

export default async function MinhaContaPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const currentUser = session.user;
  const currentAreas = ((currentUser.areas?.length ? currentUser.areas : currentUser.area ? [currentUser.area] : []) as Area[]);
  const [notificationPreferences, primaryAssignees] = await Promise.all([
    getNotificationPreferences(),
    Promise.all(
      currentAreas.map(async (area) => ({
        area,
        assignee: await getDefaultAssigneeForArea(area),
      })),
    ),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="page-hero">
        <p className="section-label">{copy.nav.links.account}</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {copy.users.account.pageTitle}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {copy.users.account.pageDescription}
        </p>
      </header>

      <AccountSettings
        userId={currentUser.id}
        username={currentUser.username}
        displayName={currentUser.name ?? ''}
        role={currentUser.role ?? null}
        areas={currentAreas}
        avatarUrl={currentUser.avatarUrl ?? null}
        isAdmin={currentUser.isAdmin}
        primaryAssignees={primaryAssignees.map((item) => ({
          area: item.area,
          id: item.assignee?.id ?? null,
          displayName: item.assignee?.displayName ?? null,
        }))}
        notificationPreferences={notificationPreferences}
      />
    </div>
  );
}
