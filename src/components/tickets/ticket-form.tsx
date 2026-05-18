'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
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
import {
  AREA_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  getSubcategories,
  type Area,
} from '@/lib/constants';
import { copy } from '@/lib/copy';
import type { User } from '@/db/schema';

const schema = z.object({
  area: z.enum(['TI', 'MKT']),
  title: z
    .string()
    .min(1, copy.tickets.form.validation.title)
    .max(80, copy.tickets.form.validation.titleMax),
  subcategory: z.string().min(1, copy.tickets.form.validation.subcategory),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  description: z.string().optional(),
  origin: z.string().optional(),
  assigneeId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TicketFormProps {
  open: boolean;
  onClose: () => void;
  users: Pick<User, 'id' | 'displayName'>[];
}

const defaultValues: FormData = {
  priority: 'media',
  area: 'TI',
  title: '',
  subcategory: '',
  assigneeId: 'none',
};

export function TicketForm({ open, onClose, users }: TicketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
  const subcategories = getSubcategories(area as Area);

  const handleAreaChange = (value: Area) => {
    setValue('area', value);
    setValue('subcategory', '');
  };

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value && value !== 'none') formData.append(key, String(value));
      });

      const result = await createTicket(formData);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }

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
    });
  };

  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.tickets.form.fields.area}</Label>
              <Select value={area} onValueChange={handleAreaChange}>
                <SelectTrigger>
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
              <Label>{copy.tickets.form.fields.subcategory}</Label>
              <Select
                key={area}
                value={subcategory ?? ''}
                onValueChange={(value) => setValue('subcategory', value)}
              >
                <SelectTrigger aria-invalid={!!errors.subcategory}>
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
                <p className="text-xs text-destructive">{errors.subcategory.message}</p>
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
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.tickets.form.fields.priority}</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as FormData['priority'])}
              >
                <SelectTrigger>
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
              <Label>{copy.tickets.form.fields.assignee}</Label>
              <Select
                value={watch('assigneeId') ?? 'none'}
                onValueChange={(value) => setValue('assigneeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.tickets.form.placeholders.assignee} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.tickets.form.placeholders.assignee}</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtra((value) => !value)}
            className="flex w-fit items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showExtra ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {showExtra ? copy.tickets.form.advanced.close : copy.tickets.form.advanced.open}
          </button>

          {showExtra && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="origin">{copy.tickets.form.fields.origin}</Label>
                <Input
                  id="origin"
                  placeholder={copy.tickets.form.placeholders.origin}
                  {...register('origin')}
                />
                <p className="text-xs text-muted-foreground">{copy.tickets.form.helper.origin}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">{copy.tickets.form.fields.description}</Label>
                <Textarea
                  id="description"
                  placeholder={copy.tickets.form.placeholders.description}
                  className="min-h-[100px]"
                  {...register('description')}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {copy.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {copy.tickets.form.actions.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
