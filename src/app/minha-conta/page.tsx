import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getNotificationPreferences } from '@/actions/notifications';
import { AccountSettings } from '@/app/configuracoes/account-settings';
import { copy } from '@/lib/copy';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: copy.metadata.account,
};

export default async function MinhaContaPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const notificationPreferences = await getNotificationPreferences();
  const currentUser = session.user;

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
        area={currentUser.area ?? null}
        avatarUrl={currentUser.avatarUrl ?? null}
        isAdmin={currentUser.isAdmin}
        notificationPreferences={notificationPreferences}
      />
    </div>
  );
}
