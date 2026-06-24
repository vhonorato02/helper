import Link from 'next/link';
import { Activity, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getActivityFeed } from '@/actions/tickets';
import { AreaBadge } from '@/components/tickets/ticket-badge';
import {
  HISTORY_FIELD_LABELS,
  HISTORY_VALUE_LABELS,
  type Area,
} from '@/lib/constants';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, formatPtBrDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Atividade' };

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
  return formatPtBrDate(date, DATE_FORMATS.tableCreated);
}

function describeChange(item: {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  const fieldKey = item.field as keyof typeof HISTORY_FIELD_LABELS;
  const fieldLabel = HISTORY_FIELD_LABELS[fieldKey] ?? item.field;

  if (item.field === 'comment_added') return 'adicionou um comentário';
  if (item.field === 'comment_edited') return 'editou um comentário';
  if (item.field === 'comment_deleted') return 'excluiu um comentário';

  const oldLabel = item.oldValue
    ? (HISTORY_VALUE_LABELS[item.oldValue as keyof typeof HISTORY_VALUE_LABELS] ??
       item.oldValue)
    : '—';
  const newLabel = item.newValue
    ? (HISTORY_VALUE_LABELS[item.newValue as keyof typeof HISTORY_VALUE_LABELS] ??
       item.newValue)
    : '—';

  return `mudou ${fieldLabel} de ${oldLabel} para ${newLabel}`;
}

export default async function AtividadePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const feed = await getActivityFeed(60);

  return (
    <div className="space-y-7">
      <div className="page-hero">
        <p className="section-label">{copy.nav.links.activity}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Atividade</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Últimas alterações em todas as demandas.
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="surface-elevated rounded-lg py-20 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">Sem atividade recente</p>
        </div>
      ) : (
        <div className="surface-elevated overflow-hidden rounded-lg divide-y divide-border/60">
          {feed.map((item) => (
            <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {(item.authorName ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold text-sm">
                      {item.authorName ?? copy.common.system}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {describeChange(item)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      href={`/tickets/${item.ticketCode}`}
                      className="font-mono text-primary hover:underline font-medium"
                    >
                      {item.ticketCode}
                    </Link>
                    <span className="min-w-0 max-w-full break-words">{item.ticketTitle}</span>
                    <AreaBadge area={item.ticketArea as Area} />
                  </div>
                  <time
                    dateTime={new Date(item.createdAt).toISOString()}
                    className="mt-2 block text-xs text-muted-foreground tabular-nums sm:hidden"
                  >
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </div>
                <time
                  dateTime={new Date(item.createdAt).toISOString()}
                  className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block"
                >
                  {formatRelativeTime(item.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
