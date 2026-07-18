import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Calendar, CalendarCheck, FileText, MapPin, Tag, User } from 'lucide-react';
import { auth } from '@/auth';
import { getComments } from '@/actions/comments';
import { getActiveQuickResponsesForTicket } from '@/actions/quick-responses';
import { getTicketTasks } from '@/actions/ticket-tasks';
import { getTicket } from '@/actions/tickets';
import { getActiveUsersForAssignment, getTicketHistory } from '@/actions/users';
import { AreaBadge, PriorityBadge, StatusBadge } from '@/components/tickets/ticket-badge';
import { Badge } from '@/components/ui/badge';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, daysUntil, formatPtBrDate } from '@/lib/format';
import { formatHolidaySummary, getHolidayByDate } from '@/lib/holidays';
import { getTicketRisk, isRiskVisible } from '@/lib/ticket-risk';
import { CommentThread } from './comment-thread';
import { HistoryLog } from './history-log';
import { TicketActions } from './actions';
import { TicketHeaderActions } from './ticket-header-actions';
import { TicketTasks } from './ticket-tasks';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code };
}

function isNextInternalError(error: unknown): boolean {
  const digest = (error as Error & { digest?: string }).digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'));
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    logger.warn(label, { error: String(error) });
    return fallback;
  }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { code } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? '';
  const currentUserIsAdmin = session?.user?.isAdmin ?? false;

  const ticket = await getTicket(code);
  if (!ticket) notFound();

  const [comments, history, users, tasks, quickResponses] = await Promise.all([
    safeLoad('ticket_comments_load_failed', () => getComments(code), []),
    safeLoad('ticket_history_load_failed', () => getTicketHistory(code), []),
    safeLoad('ticket_users_load_failed', () => getActiveUsersForAssignment(), []),
    safeLoad('ticket_tasks_load_failed', () => getTicketTasks(code), []),
    safeLoad('ticket_quick_responses_load_failed', () => getActiveQuickResponsesForTicket(code), []),
  ]);

  const authorName = ticket.author?.displayName ?? copy.common.removedUser;
  const dueDays = ticket.dueDate ? daysUntil(ticket.dueDate) : null;
  const dueHoliday = getHolidayByDate(ticket.dueDate);
  const risk = getTicketRisk(ticket);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {copy.tickets.detail.back}
      </Link>

      <header className="surface-elevated space-y-4 rounded-lg p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground/70 font-semibold bg-muted/60 px-2 py-0.5 rounded-md">
            {ticket.code}
          </span>
          <AreaBadge area={ticket.area} />
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {isRiskVisible(risk) && (
            <Badge variant={risk.level === 'critical' ? 'destructive' : 'warning'}>
              <AlertTriangle className="size-3" />
              {risk.label}
            </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <h1 className="min-w-0 text-2xl sm:text-[1.625rem] font-bold leading-tight tracking-tight">
            {ticket.title}
          </h1>
          <TicketHeaderActions code={ticket.code} />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground border-t border-border/50 pt-3.5">
          <span className="flex items-center gap-1.5">
            <Tag className="size-3.5 opacity-60" />
            {ticket.subcategory}
          </span>
          {ticket.origin && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 opacity-60" />
              {ticket.origin}
            </span>
          )}
          {ticket.location && (
            <span className="flex items-center gap-1.5" title="Localização">
              <MapPin className="size-3.5 opacity-60 text-primary" />
              {ticket.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <User className="size-3.5 opacity-60" />
            {authorName}
          </span>
          {ticket.publicContact && (
            <span className="flex items-center gap-1.5">
              <User className="size-3.5 opacity-60 text-primary" />
              {ticket.publicContact}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 opacity-60" />
            <time dateTime={new Date(ticket.createdAt).toISOString()}>
              {formatPtBrDate(ticket.createdAt, DATE_FORMATS.ticketDetail)}
            </time>
          </span>
          {ticket.dueDate && (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CalendarCheck className="size-3.5 opacity-70" />
              <time dateTime={new Date(ticket.dueDate).toISOString()}>
                {copy.due.dueAt(formatPtBrDate(ticket.dueDate, DATE_FORMATS.csvDateTime))}
              </time>
              {dueDays !== null && dueDays < 0 && (
                <span className="text-destructive">({copy.due.overdue})</span>
              )}
              {dueHoliday && (
                <span
                  className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300"
                  title={formatHolidaySummary(dueHoliday)}
                >
                  {dueHoliday.name}
                </span>
              )}
            </span>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-8 min-w-0">
          {ticket.description ? (
            <section>
              <h2 className="section-label mb-2.5 flex items-center gap-1.5">
                <FileText className="size-3.5" />
                {copy.tickets.detail.description}
              </h2>
              <div className="rounded-lg border border-border/60 bg-card p-4 text-sm leading-relaxed shadow-xs whitespace-pre-wrap">
                {ticket.description}
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {copy.tickets.detail.noDescription}
            </p>
          )}

          <TicketTasks ticketCode={code} tasks={tasks} />

          <CommentThread
            ticketCode={code}
            comments={comments}
            quickResponses={quickResponses}
            currentUserId={currentUserId}
            currentUserIsAdmin={currentUserIsAdmin}
          />

          {history.length > 0 && <HistoryLog history={history} />}
        </div>

        <TicketActions
          ticket={ticket}
          users={users}
          currentUserId={currentUserId}
          currentUserIsAdmin={currentUserIsAdmin}
        />
      </div>
    </div>
  );
}
