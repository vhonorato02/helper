'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { APP_TIMEZONE } from '@/lib/timezone';
import { MARKETING_EVENT_CATEGORIES, type MarketingEventCategory } from '@/lib/constants';
import { promoteEventToSchedule } from '@/actions/marketing-events';

export type UpcomingItem = {
  id: string;
  name: string;
  description: string | null;
  category: MarketingEventCategory;
  leadDays: number;
  date: Date;
  daysUntil: number;
};

const categoryTone: Record<MarketingEventCategory, string> = {
  comemorativa: 'bg-primary/10 text-primary ring-primary/20',
  civica: 'bg-muted text-muted-foreground ring-border/80',
  religiosa: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  escolar: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  campanha: 'bg-primary/10 text-primary ring-primary/20',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: APP_TIMEZONE,
  day: '2-digit',
  month: 'short',
});

interface UpcomingEventCardProps {
  event: UpcomingItem;
}

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePromote = () => {
    startTransition(async () => {
      const result = await promoteEventToSchedule(event.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(copy.marketing.upcoming.promoted);
      router.refresh();
    });
  };

  const shouldStart = event.daysUntil <= event.leadDays;
  const dateLabel = dateFormatter.format(event.date).replace('.', '');

  return (
    <div className="surface-elevated rounded-lg p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{event.name}</h3>
            <Badge
              variant="outline"
              className={cn('ring-1 ring-inset', categoryTone[event.category])}
            >
              {MARKETING_EVENT_CATEGORIES[event.category].label}
            </Badge>
            {shouldStart && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3" />
                Produzir agora
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{dateLabel}</span>
            {' · '}
            {copy.marketing.upcoming.inDays(event.daysUntil)}
            {' · '}
            <span>{copy.marketing.upcoming.leadHint(event.leadDays)}</span>
          </p>

          {event.description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePromote}
          disabled={isPending}
          className="shrink-0"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="size-3.5" />
          )}
          {copy.marketing.upcoming.promote}
        </Button>
      </div>
    </div>
  );
}
