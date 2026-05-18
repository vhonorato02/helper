'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil } from 'lucide-react';
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
import { updateTicketDetails } from '@/actions/tickets';
import {
  AREA_LABELS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  getSubcategories,
} from '@/lib/constants';
import { copy } from '@/lib/copy';
import type { Ticket } from '@/db/schema';

interface EditTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Pick<
    Ticket,
    'code' | 'area' | 'title' | 'subcategory' | 'priority' | 'origin' | 'description'
  >;
}

export function EditTicketDialog({ open, onOpenChange, ticket }: EditTicketDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [subcategory, setSubcategory] = useState(ticket.subcategory);
  const [priority, setPriority] = useState<Ticket['priority']>(ticket.priority);

  useEffect(() => {
    if (!open) {
      setError('');
      setSubcategory(ticket.subcategory);
      setPriority(ticket.priority);
      formRef.current?.reset();
    }
  }, [open, ticket.priority, ticket.subcategory]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    formData.set('area', ticket.area);
    formData.set('subcategory', subcategory);
    formData.set('priority', priority);

    startTransition(async () => {
      const result = await updateTicketDetails(ticket.code, formData);
      if (result && 'error' in result) {
        setError(result.error ?? copy.validation.invalidData);
        return;
      }

      toast.success(copy.tickets.detail.detailsUpdated);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Pencil className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle>{copy.tickets.detail.editDetails}</DialogTitle>
              <DialogDescription className="mt-1">{ticket.code}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.tickets.form.fields.area}</Label>
              <Input value={AREA_LABELS[ticket.area]} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>{copy.tickets.form.fields.subcategory}</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSubcategories(ticket.area).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-title">{copy.tickets.form.fields.title}</Label>
            <Input
              id="edit-ticket-title"
              name="title"
              defaultValue={ticket.title}
              maxLength={80}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.tickets.form.fields.priority}</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Ticket['priority'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((item) => (
                    <SelectItem key={item} value={item}>
                      {PRIORITY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ticket-origin">{copy.tickets.form.fields.origin}</Label>
              <Input
                id="edit-ticket-origin"
                name="origin"
                defaultValue={ticket.origin ?? ''}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-description">{copy.tickets.form.fields.description}</Label>
            <Textarea
              id="edit-ticket-description"
              name="description"
              defaultValue={ticket.description ?? ''}
              className="min-h-[130px]"
              disabled={isPending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg ring-1 ring-inset ring-destructive/20">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
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
              {copy.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
