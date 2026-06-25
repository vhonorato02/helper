'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarDays,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AreaBadge } from '@/components/tickets/ticket-badge';
import { AREA_OPTIONS } from '@/lib/constants';
import { copy } from '@/lib/copy';
import { getHolidaySchedulingNotice } from '@/lib/holidays';
import { cn } from '@/lib/utils';
import {
  createSchedule,
  deleteSchedule,
  toggleScheduleStatus,
  updateSchedule,
} from '@/actions/schedules';
import type { Schedule } from '@/db/schema';

type ScheduleRow = {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: Date;
  area: Schedule['area'];
  status: Schedule['status'];
  reminderMinutesBefore: number;
  repeatReminder: boolean;
  authorName: string | null;
};

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ScheduleRow | null;
}

function formatDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleFormDialog({ open, onOpenChange, initial }: ScheduleFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [area, setArea] = useState<string>(initial?.area ?? '');
  const [scheduledDateValue, setScheduledDateValue] = useState(
    initial ? formatDatetimeLocal(new Date(initial.scheduledDate)) : '',
  );

  const isEdit = !!initial;
  const holidayNotice =
    scheduledDateValue.length >= 10
      ? getHolidaySchedulingNotice(scheduledDateValue.slice(0, 10))
      : null;

  useEffect(() => {
    if (!open) return;
    setArea(initial?.area ?? '');
    setScheduledDateValue(initial ? formatDatetimeLocal(new Date(initial.scheduledDate)) : '');
  }, [initial, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (area && area !== 'none') formData.set('area', area);
    else formData.delete('area');

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateSchedule(initial.id, formData)
          : await createSchedule(formData);

        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }

        toast.success(isEdit ? copy.agendamentos.updated : copy.agendamentos.created);
        if ('warning' in result && result.warning) toast.warning(result.warning);
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {isEdit ? copy.agendamentos.editTitle : copy.agendamentos.createTitle}
              </DialogTitle>
              {isEdit && (
                <DialogDescription className="mt-0.5">{initial.title}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sched-title">{copy.agendamentos.form.title}</Label>
            <Input
              id="sched-title"
              name="title"
              placeholder={copy.agendamentos.form.titlePlaceholder}
              defaultValue={initial?.title}
              maxLength={120}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-date">{copy.agendamentos.form.date}</Label>
              <Input
                id="sched-date"
                name="scheduledDate"
                type="datetime-local"
                value={scheduledDateValue}
                onChange={(event) => setScheduledDateValue(event.target.value)}
                required
                disabled={isPending}
              />
              {holidayNotice && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {holidayNotice.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-area">{copy.agendamentos.form.area}</Label>
              <Select
                value={area || 'none'}
                onValueChange={(v) => setArea(v === 'none' ? '' : v)}
                disabled={isPending}
              >
                <SelectTrigger id="sched-area">
                  <SelectValue placeholder={copy.agendamentos.form.areaPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.agendamentos.form.areaPlaceholder}</SelectItem>
                  {AREA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="sched-reminder">Lembrete</Label>
              <Select
                name="reminderMinutesBefore"
                defaultValue={String(initial?.reminderMinutesBefore ?? 30)}
                disabled={isPending}
              >
                <SelectTrigger id="sched-reminder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Na hora</SelectItem>
                  <SelectItem value="5">5 minutos antes</SelectItem>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="1440">1 dia antes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex min-h-10 items-center gap-2 rounded-md border border-border/70 bg-card px-3 text-sm">
              <input
                type="checkbox"
                name="repeatReminder"
                defaultChecked={initial?.repeatReminder ?? true}
                disabled={isPending}
                className="size-4 accent-primary"
              />
              Repetir até concluir
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-desc">{copy.agendamentos.form.description}</Label>
            <Textarea
              id="sched-desc"
              name="description"
              placeholder={copy.agendamentos.form.descriptionPlaceholder}
              defaultValue={initial?.description ?? ''}
              className="min-h-[80px]"
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {copy.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? 'Salvando...' : copy.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const statusConfig: Record<
  Schedule['status'],
  { icon: React.ReactNode; label: string; classes: string }
> = {
  pendente: {
    icon: <Circle className="size-4 text-muted-foreground" aria-hidden="true" />,
    label: copy.agendamentos.status.pendente,
    classes: '',
  },
  concluido: {
    icon: <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />,
    label: copy.agendamentos.status.concluido,
    classes: 'opacity-60',
  },
  cancelado: {
    icon: <XCircle className="size-4 text-destructive" aria-hidden="true" />,
    label: copy.agendamentos.status.cancelado,
    classes: 'opacity-50',
  },
};

interface ScheduleItemProps {
  schedule: ScheduleRow;
}

export function ScheduleItem({ schedule }: ScheduleItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const cfg = statusConfig[schedule.status];
  const toggleLabel =
    schedule.status === 'pendente'
      ? 'Marcar agendamento como concluído'
      : schedule.status === 'concluido'
        ? 'Reabrir agendamento como pendente'
        : cfg.label;

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const result = await toggleScheduleStatus(schedule.id);
        if (!result || 'error' in result) {
          toast.error(result?.error ?? copy.validation.invalidData);
          return;
        }
        const msg =
          result.status === 'concluido'
            ? copy.agendamentos.markedDone
            : copy.agendamentos.markedPending;
        toast.success(msg);
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  const handleDelete = async () => {
    try {
      const result = await deleteSchedule(schedule.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(copy.agendamentos.deleted);
      router.refresh();
    } catch {
      toast.error(copy.validation.serverError);
    }
  };

  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(schedule.scheduledDate));

  return (
    <>
      <div
        className={cn(
          'surface-elevated rounded-lg p-4 transition-all',
          cfg.classes,
        )}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggle}
            disabled={isPending || schedule.status === 'cancelado'}
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-default disabled:opacity-60"
            title={toggleLabel}
            aria-label={toggleLabel}
            aria-pressed={schedule.status === 'concluido'}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              cfg.icon
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-semibold leading-snug',
                schedule.status === 'concluido' && 'line-through text-muted-foreground',
              )}
            >
              {schedule.title}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {dateLabel}
              </span>
              {schedule.area && <AreaBadge area={schedule.area} />}
              <span className="flex items-center gap-1">
                <BellRing className="size-3" />
                {schedule.reminderMinutesBefore === 0
                  ? 'na hora'
                  : schedule.reminderMinutesBefore >= 1440
                    ? '1 dia antes'
                    : `${schedule.reminderMinutesBefore} min antes`}
              </span>
            </div>

            {schedule.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {schedule.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditOpen(true)}
              title={copy.common.edit}
              aria-label={`${copy.common.edit}: ${schedule.title}`}
              disabled={isPending}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              title={copy.common.delete}
              aria-label={`${copy.common.delete}: ${schedule.title}`}
              disabled={isPending}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <ScheduleFormDialog open={editOpen} onOpenChange={setEditOpen} initial={schedule} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={copy.agendamentos.deleteTitle}
        description={copy.agendamentos.deleteDescription}
        confirmLabel={copy.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}

export function NewScheduleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {copy.agendamentos.new}
      </Button>
      <ScheduleFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
