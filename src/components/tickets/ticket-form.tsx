'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Sparkles, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createTicket } from '@/actions/tickets';
import { getSubcategoriesForArea } from '@/actions/subcategories';
import {
  AREA_OPTIONS,
  AREA_LABELS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  getSubcategories,
  type Area,
} from '@/lib/constants';
import { copy } from '@/lib/copy';
import { getHolidaySchedulingNotice } from '@/lib/holidays';
import { getTemplatesByArea, type TicketTemplate } from '@/lib/ticket-templates';
import { isEligibleAssigneeForArea } from '@/lib/assignment';
import type { User } from '@/db/schema';

const schema = z.object({
  area: z.enum(['TI', 'MKT', 'PF']),
  title: z
    .string()
    .min(1, copy.tickets.form.validation.title)
    .max(80, copy.tickets.form.validation.titleMax),
  subcategory: z.string().min(1, copy.tickets.form.validation.subcategory),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  origin: z.string().optional(),
  location: z.string().optional(),
  assigneeId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TicketFormProps {
  open: boolean;
  onClose: () => void;
  users: (Pick<User, 'id' | 'displayName' | 'role' | 'area' | 'avatarUrl'> & {
    operationalAreas?: Array<NonNullable<User['area']>>;
  })[];
}

const defaultValues: FormData = {
  priority: 'media',
  area: 'TI',
  title: '',
  subcategory: '',
  assigneeId: 'none',
  dueDate: '',
};

export function TicketForm({ open, onClose, users }: TicketFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        reset(defaultValues);
        setShowExtra(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset]);

  const area = watch('area');
  const subcategory = watch('subcategory');
  const priority = watch('priority');
  const dueDate = watch('dueDate');
  const assigneeId = watch('assigneeId');
  const dueHolidayNotice = getHolidaySchedulingNotice(dueDate);
  const [subcategories, setSubcategories] = useState<string[]>(() => [...getSubcategories(defaultValues.area)]);
  const templates = getTemplatesByArea(area);
  const eligibleUsers = users.filter((user) => isEligibleAssigneeForArea(user, area));

  useEffect(() => {
    let cancelled = false;
    getSubcategoriesForArea(area)
      .then((rows) => {
        if (!cancelled) {
          setSubcategories(
            rows.length > 0 ? rows.map((row) => row.label) : [...getSubcategories(area)],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSubcategories([...getSubcategories(area)]);
      });
    return () => {
      cancelled = true;
    };
  }, [area]);

  const handleAreaChange = (value: Area) => {
    setValue('area', value);
    setValue('subcategory', '');
    if (assigneeId !== 'none' && !users.some((user) => user.id === assigneeId && isEligibleAssigneeForArea(user, value))) {
      setValue('assigneeId', 'none');
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!assigneeId || assigneeId === 'none') return;
    if (!users.some((user) => user.id === assigneeId && isEligibleAssigneeForArea(user, area))) {
      setValue('assigneeId', 'none');
    }
  }, [area, assigneeId, open, setValue, users]);

  const applyTemplate = (template: TicketTemplate) => {
    setValue('area', template.area);
    setValue('subcategory', template.subcategory);
    setValue('title', template.title);
    setValue('priority', template.priority);
    if (template.description) setValue('description', template.description);
    if (template.location) setValue('location', template.location);
    if (template.description || template.location) setShowExtra(true);
  };

  const onSubmit = async (data: FormData) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value && value !== 'none') formData.append(key, String(value));
      });

      const result = await createTicket(formData);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      if (result.emailWarning) toast.warning(result.emailWarning);

      toast.success(copy.tickets.form.toast.created(result.code), {
        description: data.title,
        action: {
          label: copy.tickets.form.toast.open,
          onClick: () => router.push(`/tickets/${result.code}`),
        },
      });
      reset(defaultValues);
      setShowExtra(false);
      onClose();
      router.refresh();
    } catch {
      toast.error(copy.validation.serverError);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{copy.tickets.form.title}</DialogTitle>
              <DialogDescription className="mt-1">{copy.tickets.form.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          aria-busy={isSubmitting}
          noValidate
        >
          {templates.length > 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Wand2 className="size-3.5" />
                Templates rápidos
              </div>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    disabled={isSubmitting}
                    className="text-xs px-2.5 py-1 rounded-md bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors font-medium"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-area">{copy.tickets.form.fields.area}</Label>
              <Select value={area} onValueChange={handleAreaChange} disabled={isSubmitting}>
                <SelectTrigger id="ticket-area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-subcategory">{copy.tickets.form.fields.subcategory}</Label>
              <Select
                key={area}
                value={subcategory ?? ''}
                onValueChange={(value) => setValue('subcategory', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="ticket-subcategory"
                  aria-invalid={!!errors.subcategory}
                  aria-describedby={errors.subcategory ? 'ticket-subcategory-error' : undefined}
                >
                  <SelectValue placeholder={copy.tickets.form.placeholders.subcategory} />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subcategory && (
                <p id="ticket-subcategory-error" role="alert" className="text-xs text-destructive">
                  {errors.subcategory.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">{copy.tickets.form.fields.title}</Label>
            <Input
              id="title"
              placeholder={copy.tickets.form.placeholders.title}
              maxLength={80}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'ticket-title-error' : undefined}
              disabled={isSubmitting}
              {...register('title')}
            />
            {errors.title && (
              <p id="ticket-title-error" role="alert" className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-priority">{copy.tickets.form.fields.priority}</Label>
              <Select
                value={priority}
                onValueChange={(value) => setValue('priority', value as FormData['priority'])}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-assignee">{copy.tickets.form.fields.assignee}</Label>
              <Select
                value={assigneeId ?? 'none'}
                onValueChange={(value) => setValue('assigneeId', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ticket-assignee">
                  <SelectValue placeholder={copy.tickets.form.placeholders.assignee} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.tickets.form.placeholders.assignee}</SelectItem>
                  {eligibleUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                      {user.operationalAreas?.length
                        ? ` · ${user.operationalAreas.map((item) => AREA_LABELS[item]).join(', ')}`
                        : user.area
                          ? ` · ${AREA_LABELS[user.area]}`
                          : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtra((value) => !value)}
            disabled={isSubmitting}
            className="flex w-fit items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showExtra ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {showExtra ? copy.tickets.form.advanced.close : copy.tickets.form.advanced.open}
          </button>

          {showExtra && (
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="origin">{copy.tickets.form.fields.origin}</Label>
                  <Input
                    id="origin"
                    placeholder={copy.tickets.form.placeholders.origin}
                    disabled={isSubmitting}
                    {...register('origin')}
                  />
                  <p className="text-xs text-muted-foreground">{copy.tickets.form.helper.origin}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">{copy.tickets.form.fields.dueDate}</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    placeholder={copy.tickets.form.placeholders.dueDate}
                    disabled={isSubmitting}
                    {...register('dueDate')}
                  />
                  <p className="text-xs text-muted-foreground">{copy.due.optional}</p>
                  {dueHolidayNotice && (
                    <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{dueHolidayNotice.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">{copy.tickets.form.fields.location}</Label>
                <Input
                  id="location"
                  placeholder={copy.tickets.form.placeholders.location}
                  disabled={isSubmitting}
                  {...register('location')}
                />
                <p className="text-xs text-muted-foreground">{copy.tickets.form.helper.location}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">{copy.tickets.form.fields.description}</Label>
                <Textarea
                  id="description"
                  placeholder={copy.tickets.form.placeholders.description}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                  {...register('description')}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {copy.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? 'Criando...' : copy.tickets.form.actions.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
