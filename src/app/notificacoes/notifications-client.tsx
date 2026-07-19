'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { markNotificationRead } from '@/actions/notifications';
import { Button } from '@/components/ui/button';
import { copy } from '@/lib/copy';
import { shouldHandleNotificationNavigation } from '@/lib/notification-interactions';
import { cn } from '@/lib/utils';

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

export function NotificationsClient({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const markRead = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await markNotificationRead(id);
        if (!result || 'error' in result) {
          toast.error(copy.notifications.markReadFailed);
          return;
        }
        toast.success(copy.notifications.markedRead);
        router.refresh();
      } catch {
        toast.error(copy.notifications.markReadFailed);
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="divide-y">
      {items.map((item) => {
        const isUnread = !item.readAt;
        const isItemPending = isPending && pendingId === item.id;
        const content = (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="break-words text-sm font-semibold">{item.title}</p>
              <time className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
            </div>
            {item.body && <p className="mt-1 break-words text-sm text-muted-foreground">{item.body}</p>}
          </div>
        );

        return (
          <div
            key={item.id}
            className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/60 sm:flex-row sm:items-start"
          >
            <span
              className={cn(
                'mt-1 size-2 shrink-0 rounded-full',
                item.readAt ? 'bg-muted-foreground/30' : 'bg-primary',
              )}
            >
              <span className="sr-only">{isUnread ? 'Não lida' : 'Lida'}</span>
            </span>
            {item.link ? (
              <Link
                href={item.link}
                aria-disabled={isItemPending}
                className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={(event) => {
                  const destination = item.link;
                  if (!isUnread || !destination || isItemPending) return;
                  if (
                    !shouldHandleNotificationNavigation({
                      altKey: event.altKey,
                      button: event.button,
                      ctrlKey: event.ctrlKey,
                      defaultPrevented: event.defaultPrevented,
                      metaKey: event.metaKey,
                      shiftKey: event.shiftKey,
                      target: event.currentTarget.target,
                    })
                  ) {
                    return;
                  }

                  event.preventDefault();
                  setPendingId(item.id);
                  startTransition(async () => {
                    try {
                      const result = await markNotificationRead(item.id);
                      if (!result || 'error' in result) {
                        toast.error(copy.notifications.markReadFailed);
                      }
                    } catch {
                      toast.error(copy.notifications.markReadFailed);
                    } finally {
                      setPendingId(null);
                      router.push(destination);
                    }
                  });
                }}
              >
                {content}
              </Link>
            ) : (
              content
            )}
            {isUnread && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 self-start gap-1.5"
                onClick={() => markRead(item.id)}
                disabled={isItemPending}
              >
                {isItemPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {copy.notifications.markRead}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
