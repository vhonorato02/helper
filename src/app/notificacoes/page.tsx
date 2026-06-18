import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead } from '@/actions/notifications';
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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status === 'unread' ? 'unread' : 'all';
  const items = await getMyNotifications();
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
