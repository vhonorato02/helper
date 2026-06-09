import { Suspense } from 'react';
import Link from 'next/link';
import { FileInput, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { getTicketCount, getTickets } from '@/actions/tickets';
import { getActiveUsersForAssignment } from '@/actions/users';
import { TicketTable } from '@/components/tickets/ticket-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const metadata = { title: copy.metadata.tickets };

interface PageProps {
  searchParams: Promise<{
    area?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    origin?: string;
    search?: string;
    attention?: string;
    due?: string;
    sort?: string;
    page?: string;
  }>;
}

async function TicketList({ searchParams }: { searchParams: Awaited<PageProps['searchParams']> }) {
  const parsedPage = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
  const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;
  const filters = {
    area: searchParams.area,
    status: searchParams.status,
    priority: searchParams.priority,
    assigneeId: searchParams.assigneeId,
    origin: searchParams.origin,
    search: searchParams.search,
    attention: searchParams.attention,
    due: searchParams.due,
    sort: searchParams.sort,
  };

  const [total, usersResult, session] = await Promise.all([
    getTicketCount(filters),
    getActiveUsersForAssignment().catch((error: unknown) => {
      const digest = (error as Error & { digest?: string }).digest;
      if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))) throw error;
      logger.warn('ticket_users_load_failed', { error: String(error) });
      return [];
    }),
    auth(),
  ]);
  const users = usersResult;
  const safePage = Math.min(page, Math.max(Math.ceil(total / 50), 1));
  const tickets = await getTickets({
    ...filters,
    page: safePage,
  });

  return (
    <TicketTable
      tickets={tickets}
      users={users}
      total={total}
      page={safePage}
      pageSize={50}
      currentUserId={session?.user?.id ?? ''}
    />
  );
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">{copy.nav.links.tickets}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {copy.tickets.page.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {copy.tickets.page.description}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" asChild className="w-fit">
            <Link href="/tickets?origin=public&status=ativas">
              <FileInput className="size-4" />
              Entrada externa
            </Link>
          </Button>
          <Button asChild className="w-fit">
            <Link href="/tickets?novo=1">
              <Plus className="size-4" />
              {copy.nav.newTicket}
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="surface-elevated rounded-lg p-3 sm:p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_auto]">
                <Skeleton className="h-10 min-w-0" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10 sm:col-span-2 lg:col-span-1 xl:col-span-2" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        }
      >
        <TicketList searchParams={params} />
      </Suspense>
    </div>
  );
}
