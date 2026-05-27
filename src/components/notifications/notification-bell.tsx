'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getUnreadNotificationCount } from '@/actions/notifications';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const nextCount = await getUnreadNotificationCount();
        if (active) setCount(nextCount);
      } catch {
        if (active) setCount(0);
      }
    };

    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <Link
      href="/notificacoes"
      className={cn(
        'relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        count > 0 && 'text-primary',
      )}
      aria-label={count > 0 ? `${count} notificações não lidas` : 'Notificações'}
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
