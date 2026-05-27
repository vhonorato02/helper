import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ForcePasswordChange } from '@/components/force-password-change';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Alterar senha',
};

export default async function AlterarSenhaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [row] = await db
    .select({ mustChangePassword: users.mustChangePassword, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row?.mustChangePassword) redirect('/');

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <header className="page-hero">
        <h1 className="text-2xl font-bold tracking-tight">Alteração de senha obrigatória</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Por segurança, defina uma nova senha antes de continuar usando o sistema.
        </p>
      </header>
      <ForcePasswordChange
        userId={session.user.id}
        displayName={row.displayName}
      />
    </div>
  );
}
