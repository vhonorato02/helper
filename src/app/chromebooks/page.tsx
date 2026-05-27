import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Laptop2 } from 'lucide-react';
import { auth } from '@/auth';
import {
  getChromebookBookings,
  getChromebookDaySummary,
  getChromebookSettings,
} from '@/actions/chromebooks';
import { Button } from '@/components/ui/button';
import { ChromebookAdminClient } from './chromebook-admin-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chromebooks',
};

interface PageProps {
  searchParams: Promise<{
    date?: string;
    status?: string;
    room?: string;
    quantity?: string;
  }>;
}

export default async function ChromebooksPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/chromebooks');

  const params = await searchParams;
  const [bookings, settings, summary] = await Promise.all([
    getChromebookBookings(params),
    getChromebookSettings(),
    getChromebookDaySummary(params.date),
  ]);

  return (
    <div className="space-y-6">
      <div className="page-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">Chromebooks</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            <Laptop2 className="size-6 text-primary" />
            Controle de Chromebooks
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Empréstimos, disponibilidade por horário e conflitos de sala ou quantidade.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/chromebooks/solicitar">Página pública de solicitação</Link>
        </Button>
      </div>

      <ChromebookAdminClient
        bookings={bookings}
        settings={settings}
        summary={summary}
        filters={params}
        currentUserName={session.user.name ?? session.user.username ?? ''}
        isAdmin={!!session.user.isAdmin}
      />
    </div>
  );
}
