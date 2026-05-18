import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Shield, Users } from 'lucide-react';
import { getUsers } from '@/actions/users';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from './user-list';
import { CreateUserForm } from './create-user-form';
import { AccountSettings } from './account-settings';
import { copy } from '@/lib/copy';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: copy.metadata.settings,
};

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user || !session.user.isAdmin) redirect('/');

  const users = await getUsers();
  const currentUser = session.user;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{copy.nav.links.settings}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.users.page.title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          {copy.users.page.description}
        </p>
      </header>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="size-3.5" />
            {copy.users.page.usersTab}
          </TabsTrigger>
          <TabsTrigger value="minha-conta" className="gap-1.5">
            <Shield className="size-3.5" />
            {copy.users.page.accountTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold">{copy.users.page.teamTitle(users.length)}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {copy.users.page.teamDescription}
                </p>
              </div>
            </div>
            <UserList users={users} currentUserId={currentUser.id} />
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold">{copy.users.page.addTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {copy.users.page.addDescription}
              </p>
            </div>
            <CreateUserForm />
          </section>
        </TabsContent>

        <TabsContent value="minha-conta" className="space-y-6 mt-6">
          <AccountSettings
            userId={currentUser.id}
            displayName={currentUser.name ?? ''}
            isAdmin={currentUser.isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
