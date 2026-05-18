import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Inbox,
  Megaphone,
  Monitor,
  UserCheck,
  Zap,
} from 'lucide-react';
import { auth } from '@/auth';
import {
  getAttentionTickets,
  getDashboardStats,
  getTicketCount,
  getTickets,
} from '@/actions/tickets';
import { AreaBadge, PriorityBadge, StatusBadge } from '@/components/tickets/ticket-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { copy } from '@/lib/copy';
import { capitalizeFirst, DATE_FORMATS, daysSince, formatPtBrDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type AttentionTicket = Awaited<ReturnType<typeof getAttentionTickets>>[number];
type TicketRow = Awaited<ReturnType<typeof getTickets>>[number];

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  accent?: 'default' | 'destructive' | 'warning' | 'success';
  empty?: string;
}

function StatCard({ label, value, icon, href, accent = 'default', empty }: StatCardProps) {
  const accentClass = {
    default: 'bg-primary/10 text-primary ring-primary/15',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/15',
    warning: 'bg-amber-500/12 text-amber-700 dark:text-amber-400 ring-amber-500/18',
    success: 'bg-green-500/10 text-green-700 dark:text-green-400 ring-green-500/18',
  }[accent];

  const borderAccent = {
    default: '',
    destructive: 'hover:border-destructive/20',
    warning: 'hover:border-amber-500/20',
    success: 'hover:border-green-500/20',
  }[accent];

  return (
    <Link
      href={href}
      className={cn(
        'group surface-panel rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5',
        borderAccent,
        accent === 'default' && 'hover:border-foreground/18',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label line-clamp-1">{label}</p>
          <p className="mt-2 text-[2rem] font-bold tabular-nums tracking-tight leading-none">
            {value}
          </p>
          {value === 0 && empty && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{empty}</p>
          )}
        </div>
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-all group-hover:scale-105',
            accentClass,
          )}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (hour < 12) return copy.dashboard.greeting.morning(firstName);
  if (hour < 18) return copy.dashboard.greeting.afternoon(firstName);
  return copy.dashboard.greeting.evening(firstName);
}

function EmptyHint({ text }: { text: string }) {
  const [before, after] = text.split('N');
  return (
    <>
      {before}
      <kbd className="kbd mx-0.5">N</kbd>
      {after}
    </>
  );
}

function AttentionQueue({ tickets }: { tickets: AttentionTicket[] }) {
  return (
    <section className="xl:sticky xl:top-20 xl:self-start">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            {copy.dashboard.attention.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {copy.dashboard.attention.description}
          </p>
        </div>
        <Link
          href="/tickets?attention=true"
          className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
        >
          {copy.dashboard.attention.viewAll}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="surface-elevated rounded-xl px-5 py-12 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-inset ring-green-500/15">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-semibold">{copy.dashboard.attention.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {copy.dashboard.attention.emptyHint}
          </p>
        </div>
      ) : (
        <div className="surface-elevated overflow-hidden rounded-xl divide-y divide-border/60">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.code}`}
              className="block p-3.5 transition-all hover:bg-muted/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-primary font-medium">
                      {ticket.code}
                    </span>
                    <Badge variant={ticket.rank === 0 ? 'destructive' : 'warning'}>
                      {ticket.reason}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
                </div>
                <PriorityBadge priority={ticket.priority} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AreaBadge area={ticket.area} />
                  <span className="truncate">{ticket.subcategory}</span>
                </div>
                <span className="shrink-0 tabular-nums">
                  {copy.dashboard.attention.age(ticket.ageDays)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">
                  {copy.dashboard.attention.assignee}:{' '}
                  {ticket.assigneeName ?? copy.dashboard.attention.noAssignee}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MyQueue({ tickets, href }: { tickets: TicketRow[]; href: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            {copy.dashboard.myQueue.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {copy.dashboard.myQueue.description}
          </p>
        </div>
        <Link
          href={href}
          className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
        >
          {copy.dashboard.myQueue.viewAll}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="surface-elevated rounded-xl px-5 py-6">
          <p className="font-semibold">{copy.dashboard.myQueue.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {copy.dashboard.myQueue.emptyHint}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {tickets.map((ticket) => {
            const staleDays = daysSince(ticket.updatedAt);

            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.code}`}
                className="surface-elevated rounded-xl p-3.5 transition-all hover:shadow-md hover:border-foreground/15 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-primary font-medium">
                      {ticket.code}
                    </span>
                    <p className="text-sm font-medium leading-snug line-clamp-2 mt-1">
                      {ticket.title}
                    </p>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={ticket.status} />
                  <span className="tabular-nums shrink-0">
                    {copy.dashboard.myQueue.updated(staleDays)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? copy.dashboard.greeting.fallbackName;
  const currentUserId = session?.user?.id ?? '';

  const [stats, recentTickets, attentionTickets, myTicketCount, myTickets] = await Promise.all([
    getDashboardStats(),
    getTickets({ page: 1 }),
    getAttentionTickets(),
    currentUserId
      ? getTicketCount({ assigneeId: currentUserId, status: 'ativas' })
      : Promise.resolve(0),
    currentUserId
      ? getTickets({
          assigneeId: currentUserId,
          status: 'ativas',
          sort: 'priority',
          page: 1,
        })
      : Promise.resolve([]),
  ]);

  const recent = recentTickets.slice(0, 8);
  const myQueue = myTickets.slice(0, 4);
  const myQueueHref = currentUserId
    ? `/tickets?assigneeId=${currentUserId}&status=ativas`
    : '/tickets';
  const today = capitalizeFirst(formatPtBrDate(new Date(), DATE_FORMATS.dashboardDay));

  return (
    <div className="space-y-7">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            {today}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {getGreeting(userName)}
          </h1>
        </div>
        <Link
          href="/tickets?attention=true"
          className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3.5 py-2 text-sm font-semibold text-muted-foreground shadow-xs transition-all hover:bg-accent hover:text-foreground hover:border-foreground/20"
        >
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          {copy.dashboard.attention.title}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={copy.dashboard.stats.openTi}
          value={Number(stats.abertosTI)}
          icon={<Monitor className="size-4" />}
          href="/tickets?area=TI&status=aberto"
          empty={copy.dashboard.stats.allClear}
        />
        <StatCard
          label={copy.dashboard.stats.openMkt}
          value={Number(stats.abertosMKT)}
          icon={<Megaphone className="size-4" />}
          href="/tickets?area=MKT&status=aberto"
          empty={copy.dashboard.stats.allClear}
        />
        <StatCard
          label={copy.dashboard.stats.myOpen}
          value={Number(myTicketCount)}
          icon={<UserCheck className="size-4" />}
          href={myQueueHref}
          empty={copy.dashboard.stats.nothingAssigned}
        />
        <StatCard
          label={copy.dashboard.stats.urgent}
          value={Number(stats.urgentes)}
          icon={<Zap className="size-4" />}
          href="/tickets?priority=urgente"
          accent="destructive"
          empty={copy.dashboard.stats.noUrgencies}
        />
        <StatCard
          label={copy.dashboard.stats.waiting}
          value={Number(stats.aguardando)}
          icon={<Clock className="size-4" />}
          href="/tickets?status=aguardando"
          accent="warning"
          empty={copy.dashboard.stats.noBlocks}
        />
        <StatCard
          label={copy.dashboard.stats.resolvedWeek}
          value={Number(stats.resolvidosSemana)}
          icon={<CheckCircle2 className="size-4" />}
          href="/tickets?status=resolvido"
          accent="success"
          empty={copy.dashboard.stats.noneThisWeek}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-6">
          <MyQueue tickets={myQueue} href={myQueueHref} />

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {copy.dashboard.recent.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {copy.dashboard.recent.description}
                </p>
              </div>
              <Link
                href="/tickets"
                className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
              >
                {copy.dashboard.recent.viewAll} <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="surface-elevated rounded-xl py-16 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted/60">
                  <Inbox className="size-5 text-muted-foreground" />
                </div>
                <p className="font-semibold">{copy.dashboard.recent.emptyTitle}</p>
                <p className="text-sm text-muted-foreground mt-1.5">
                  <EmptyHint text={copy.dashboard.recent.emptyHint} />
                </p>
              </div>
            ) : (
              <div className="surface-elevated overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/55 text-xs">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                          {copy.tickets.table.headers.code}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                          {copy.tickets.table.headers.title}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                          {copy.tickets.table.headers.area}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                          {copy.tickets.table.headers.priority}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                          {copy.tickets.table.headers.status}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                          {copy.tickets.table.headers.createdAt}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/tickets/${ticket.code}`}
                              className="font-mono text-xs text-primary hover:underline font-medium"
                            >
                              {ticket.code}
                            </Link>
                          </td>
                          <td className="px-4 py-3 max-w-[280px]">
                            <Link
                              href={`/tickets/${ticket.code}`}
                              className="hover:underline line-clamp-1 font-medium"
                            >
                              {ticket.title}
                            </Link>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {ticket.subcategory}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <AreaBadge area={ticket.area} />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <PriorityBadge priority={ticket.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={ticket.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                            {formatPtBrDate(ticket.createdAt, DATE_FORMATS.dashboardRecent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        <AttentionQueue tickets={attentionTickets} />
      </div>
    </div>
  );
}
