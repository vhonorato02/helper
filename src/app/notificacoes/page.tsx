import Link from 'next/link';
import { Bell, CalendarClock, CheckCheck } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead } from '@/actions/notifications';
import { getOperationalReminders, type ReminderPulseItem } from '@/actions/reminder-pulse';
import { BrowserNotificationPermissionPanel } from '@/components/notifications/browser-notification-agent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationsClient } from './notifications-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Notificações',
};

async function markAllAction() {
  'use server';
  await markAllNotificationsRead();
}

function formatReminderDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function ReminderRadar({ items }: { items: ReminderPulseItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="surface-elevated overflow-hidden rounded-lg">
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" />
          Radar de agora
        </h2>
      </div>
      <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
        {items.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block min-w-0 p-4 transition-colors hover:bg-muted/40"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Badge
                variant={
                  item.priority === 'overdue'
                    ? 'destructive'
                    : item.priority === 'now'
                      ? 'warning'
                      : 'secondary'
                }
              >
                {item.priority === 'overdue'
                  ? 'passou'
                  : item.priority === 'now'
                    ? 'agora'
                    : 'em breve'}
              </Badge>
              <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatReminderDate(item.dueAt)}
              </time>
            </div>
            <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status === 'unread' ? 'unread' : 'all';
  const [items, reminders] = await Promise.all([
    getMyNotifications(),
    getOperationalReminders(8),
  ]);
  const unreadCount = items.filter((item) => !item.readAt).length;
  const visibleItems = filter === 'unread' ? items.filter((item) => !item.readAt) : items;
  const clientItems = visibleItems.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    link: item.link,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-label">Inbox interna</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Notificações</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Acompanhe avisos importantes mesmo quando o e-mail não chamar atenção.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={filter === 'all' ? 'default' : 'outline'} size="sm">
              <Link href="/notificacoes">Todas</Link>
            </Button>
            <Button asChild variant={filter === 'unread' ? 'default' : 'outline'} size="sm">
              <Link href="/notificacoes?status=unread">Não lidas ({unreadCount})</Link>
            </Button>
            {unreadCount > 0 && (
              <form action={markAllAction}>
                <Button type="submit" variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="size-4" />
                  Marcar tudo como lidas
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <BrowserNotificationPermissionPanel />
      <ReminderRadar items={reminders} />

      <section className="surface-elevated overflow-hidden rounded-lg">
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <h2 className="text-base font-semibold">
              {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nada por aqui'}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {filter === 'unread'
                ? 'Quando algo novo chegar, este recorte volta a mostrar as pendências.'
                : 'Quando houver novas atribuições, pedidos públicos ou avisos relevantes, eles aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <NotificationsClient items={clientItems} />
        )}
      </section>
    </div>
  );
}
