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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.kanban.page.title}</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {copy.kanban.page.description}
          </p>
        </div>
        <KanbanFilters users={activeUsers} />
      </div>

      <KanbanBoard initialTickets={tickets} />
    </div>
  );
}
