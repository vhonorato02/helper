'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ViewToggle({ current }: { current: 'list' | 'calendar' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (v: 'list' | 'calendar') => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'list') params.delete('view');
    else params.set('view', v);
    const qs = params.toString();
    router.push(`/agendamentos${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="inline-flex items-center rounded-md border border-border p-0.5 bg-card">
      <button
        type="button"
        onClick={() => setView('list')}
        aria-pressed={current === 'list'}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
          current === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <List className="size-3.5" />
        Lista
      </button>
      <button
        type="button"
        onClick={() => setView('calendar')}
        aria-pressed={current === 'calendar'}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
          current === 'calendar'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <CalendarDays className="size-3.5" />
        Calendário
      </button>
    </div>
  );
}
