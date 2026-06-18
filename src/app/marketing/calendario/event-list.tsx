'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarPlus,
  EyeOff,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EventFormDialog } from './event-form';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import {
  MARKETING_EVENT_CATEGORIES,
  type MarketingEventCategory,
} from '@/lib/constants';
import {
  deleteMarketingEvent,
  promoteEventToSchedule,
  toggleMarketingEvent,
} from '@/actions/marketing-events';
import type { MarketingEvent } from '@/db/schema';

const categoryTone: Record<MarketingEventCategory, string> = {
  comemorativa: 'bg-primary/10 text-primary ring-primary/20',
  civica: 'bg-muted text-muted-foreground ring-border/80',
  religiosa: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  escolar: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  campanha: 'bg-primary/10 text-primary ring-primary/20',
};

interface EventRowProps {
  event: MarketingEvent;
  canEdit: boolean;
}

export function EventRow({ event, canEdit }: EventRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const result = await toggleMarketingEvent(event.id);
        if (!result || 'error' in result) {
          toast.error(result?.error ?? copy.validation.invalidData);
          return;
        }
        toast.success(
          result.isActive
            ? copy.marketing.calendar.activated
            : copy.marketing.calendar.deactivated,
        );
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  const handlePromote = () => {
    startTransition(async () => {
      try {
        const result = await promoteEventToSchedule(event.id);
        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }
        toast.success(copy.marketing.upcoming.promoted);
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  const handleDelete = async () => {
    try {
      const result = await deleteMarketingEvent(event.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(copy.marketing.calendar.deleted);
      router.refresh();
    } catch {
      toast.error(copy.validation.serverError);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 transition-all',
          !event.isActive && 'opacity-50',
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted/50">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {monthShort(event.month)}
            </span>
            <span className="text-sm font-bold tabular-nums leading-none">{event.day}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{event.name}</span>
              <Badge
                variant="outline"
                className={cn(
                  'ring-1 ring-inset text-xs',
                  categoryTone[event.category as MarketingEventCategory],
                )}
              >
                {MARKETING_EVENT_CATEGORIES[event.category as MarketingEventCategory].label}
              </Badge>
            </div>
            {event.description && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {copy.marketing.upcoming.leadHint(event.leadDays)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={handlePromote}
            title={copy.marketing.upcoming.promote}
            aria-label={`${copy.marketing.upcoming.promote}: ${event.name}`}
            disabled={isPending}
          >
            <CalendarPlus className="size-3.5" />
          </Button>
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleToggle}
                title={event.isActive ? 'Desativar' : 'Ativar'}
                aria-label={`${event.isActive ? 'Desativar' : 'Ativar'}: ${event.name}`}
                disabled={isPending}
              >
                {event.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setEditOpen(true)}
                title={copy.common.edit}
                aria-label={`${copy.common.edit}: ${event.name}`}
                disabled={isPending}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                title={copy.common.delete}
                aria-label={`${copy.common.delete}: ${event.name}`}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <>
          <EventFormDialog open={editOpen} onOpenChange={setEditOpen} initial={event} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={copy.marketing.calendar.deleteTitle}
            description={copy.marketing.calendar.deleteDescription}
            confirmLabel={copy.common.delete}
            onConfirm={handleDelete}
            variant="destructive"
          />
        </>
      )}
    </>
  );
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function monthShort(month: number) {
  return MONTH_SHORT[(month - 1) % 12] ?? '';
}

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {copy.marketing.calendar.new}
      </Button>
      <EventFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
