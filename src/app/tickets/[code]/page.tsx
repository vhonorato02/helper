import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, MapPin, Tag, User } from 'lucide-react';
import { auth } from '@/auth';
import { getComments } from '@/actions/comments';
import { getTicket } from '@/actions/tickets';
import { getTicketHistory, getUsers } from '@/actions/users';
import { AreaBadge, PriorityBadge, StatusBadge } from '@/components/tickets/ticket-badge';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, formatPtBrDate } from '@/lib/format';
import { CommentThread } from './comment-thread';
import { HistoryLog } from './history-log';
import { TicketActions } from './actions';
import { TicketHeaderActions } from './ticket-header-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code };
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { code } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? '';
  const currentUserIsAdmin = session?.user?.isAdmin ?? false;

  const [ticket, comments, history, users] = await Promise.all([
    getTicket(code),
    getComments(code),
    getTicketHistory(code),
    getUsers(),
  ]);

  if (!ticket) notFound();

  const activeUsers = users.filter((user) => user.isActive);
  const authorName = ticket.author?.displayName ?? copy.common.removedUser;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {copy.tickets.detail.back}
      </Link>

      <header className="surface-panel space-y-4 rounded-lg p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground font-medium">{ticket.code}</span>
          <span className="text-muted-foreground/40">·</span>
          <AreaBadge area={ticket.area} />
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <h1 className="min-w-0 text-2xl sm:text-3xl font-semibold leading-tight tracking-tight">
            {ticket.title}
          </h1>
          <TicketHeaderActions code={ticket.code} />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Tag className="size-3.5" />
            {ticket.subcategory}
          </span>
          {ticket.origin && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {ticket.origin}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {authorName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            <time dateTime={new Date(ticket.createdAt).toISOString()}>
              {formatPtBrDate(ticket.createdAt, DATE_FORMATS.ticketDetail)}
            </time>
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-8 min-w-0">
          {ticket.description ? (
            <section>
              <h2 className="text-xs font-semibold mb-2.5 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5" />
                {copy.tickets.detail.description}
              </h2>
              <div className="rounded-lg border border-border/70 bg-card p-4 text-sm leading-relaxed shadow-xs whitespace-pre-wrap">
                {ticket.description}
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {copy.tickets.detail.noDescription}
            </p>
          )}

          <CommentThread
            ticketCode={code}
            comments={comments}
            currentUserId={currentUserId}
            currentUserIsAdmin={currentUserIsAdmin}
          />

          {history.length > 0 && <HistoryLog history={history} />}
        </div>

        <TicketActions
          ticket={ticket}
          users={activeUsers}
          currentUserId={currentUserId}
          currentUserIsAdmin={currentUserIsAdmin}
        />
      </div>
    </div>
  );
}
