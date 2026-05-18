import { getKanbanTickets } from '@/actions/tickets';
import { getUsers } from '@/actions/users';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { copy } from '@/lib/copy';
import { KanbanFilters } from './filters';

export const dynamic = 'force-dynamic';

export const metadata = { title: copy.metadata.kanban };

interface PageProps {
  searchParams: Promise<{
    area?: string;
    assigneeId?: string;
    priority?: string;
    search?: string;
  }>;
}

export default async function KanbanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [tickets, users] = await Promise.all([
    getKanbanTickets({
      area: params.area,
      assigneeId: params.assigneeId,
      priority: params.priority,
      search: params.search,
    }),
    getUsers(),
  ]);

  const activeUsers = users.filter((user) => user.isActive);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-lg border bg-card/75 p-4 shadow-xs lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{copy.nav.links.kanban}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {copy.kanban.page.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {copy.kanban.page.description}
          </p>
        </div>
        <KanbanFilters users={activeUsers} />
      </div>

      <KanbanBoard initialTickets={tickets} />
    </div>
  );
}
