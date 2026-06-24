'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarRange, Loader2 } from 'lucide-react';
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
import { copy } from '@/lib/copy';
import { APP_TIMEZONE } from '@/lib/timezone';
import {
  MARKETING_EVENT_CATEGORIES,
  type MarketingEventCategory,
} from '@/lib/constants';
import {
  createMarketingEvent,
  updateMarketingEvent,
} from '@/actions/marketing-events';
import type { MarketingEvent } from '@/db/schema';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MarketingEvent | null;
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function currentAppMonth() {
  return Number(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE,
      month: 'numeric',
    }).format(new Date()),
  );
}

function daysInMonth(month: string) {
  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return 31;
  return new Date(Date.UTC(2024, monthNumber, 0)).getUTCDate();
}

export function EventFormDialog({ open, onOpenChange, initial }: EventFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<MarketingEventCategory>(
    (initial?.category as MarketingEventCategory) ?? 'comemorativa',
  );
  const [month, setMonth] = useState<string>(String(initial?.month ?? currentAppMonth()));
  const [day, setDay] = useState<string>(initial?.day ? String(initial.day) : '');

  const isEdit = !!initial;
  const maxDay = daysInMonth(month);

  useEffect(() => {
    if (!open) return;
    setCategory((initial?.category as MarketingEventCategory) ?? 'comemorativa');
    setMonth(String(initial?.month ?? currentAppMonth()));
    setDay(initial?.day ? String(initial.day) : '');
  }, [initial, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('category', category);
    formData.set('month', month);
    formData.set('day', day);

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateMarketingEvent(initial.id, formData)
          : await createMarketingEvent(formData);

        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }

        toast.success(
          isEdit ? copy.marketing.calendar.updated : copy.marketing.calendar.created,
        );
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
              <CalendarRange className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {isEdit
                  ? copy.marketing.calendar.editTitle
                  : copy.marketing.calendar.createTitle}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isEdit ? initial.name : copy.marketing.calendar.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="evt-name">{copy.marketing.calendar.form.name}</Label>
            <Input
              id="evt-name"
              name="name"
              placeholder={copy.marketing.calendar.form.namePlaceholder}
              defaultValue={initial?.name}
              maxLength={120}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="evt-day">Dia</Label>
              <Input
                id="evt-day"
                name="day"
                type="number"
                min={1}
                max={maxDay}
                value={day}
                onChange={(event) => setDay(event.currentTarget.value)}
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Dia 1 a {maxDay} para o mês selecionado.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="evt-month">{copy.marketing.calendar.monthsLabel}</Label>
              <Select value={month} onValueChange={setMonth} disabled={isPending}>
                <SelectTrigger id="evt-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, idx) => (
                    <SelectItem key={label} value={String(idx + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evt-category">{copy.marketing.calendar.form.category}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as MarketingEventCategory)}
                disabled={isPending}
              >
                <SelectTrigger id="evt-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MARKETING_EVENT_CATEGORIES).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-lead">{copy.marketing.calendar.form.leadDays}</Label>
              <Input
                id="evt-lead"
                name="leadDays"
                type="number"
                min={0}
                max={180}
                defaultValue={initial?.leadDays ?? 7}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                {copy.marketing.calendar.form.leadDaysHint}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-desc">{copy.marketing.calendar.form.description}</Label>
            <Textarea
              id="evt-desc"
              name="description"
              placeholder={copy.marketing.calendar.form.descriptionPlaceholder}
              defaultValue={initial?.description ?? ''}
              className="min-h-[80px]"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-sort">{copy.marketing.calendar.form.sortOrder}</Label>
            <Input
              id="evt-sort"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={initial?.sortOrder ?? 100}
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
