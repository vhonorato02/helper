import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead } from '@/actions/notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Notificações',
};

async function markAllAction() {
  'use server';
  await markAllNotificationsRead();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

export default async function NotificationsPage() {
  const items = await getMyNotifications();
  const unreadCount = items.filter((item) => !item.readAt).length;

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
          {unreadCount > 0 && (
            <form action={markAllAction}>
              <Button type="submit" variant="outline" className="gap-2">
                <CheckCheck className="size-4" />
                Marcar tudo como lida
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="surface-elevated overflow-hidden rounded-lg">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <h2 className="text-base font-semibold">Nada por aqui</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Quando houver novas atribuições, pedidos públicos ou avisos relevantes, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const content = (
                <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                  <span
                    className={cn(
                      'mt-1 size-2 shrink-0 rounded-full',
                      item.readAt ? 'bg-muted-foreground/30' : 'bg-primary',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <time className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
                    </div>
                    {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
                  </div>
                </div>
              );

              return item.link ? (
                <Link key={item.id} href={item.link}>
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
